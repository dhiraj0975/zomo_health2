import { appConstant, CommonArrayService, CommonDateService, CommonService, QuizWebinarDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TranslationService } from "../../translation/translation.service";
import { QuizWebinarService } from './quizwebinar.service';
import { QuizWebinarPaginateInput } from './input/quizwebinarpaginate.input';
import { QuizWebinarCreateInput } from './input/quizwebinarcreate.input';
import { Not } from 'typeorm';
import { QuizWebinarDeleteInput } from './input/quizwebinardelete.input';
import { QuizWebinarGetOneInput } from './input/quizwebinargetone.input';
import { QuizWebinarListInput } from './input/quizwebinarlist.input';
import { lastValueFrom } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { FrontService } from '../front/front.service';
@Controller('quiz/webinar')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuizWebinarController {
    constructor(
        private readonly quizWebinarService: QuizWebinarService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly frontService: FrontService,
        @Inject('COMMON_SERVICE') private commonMicroservice: ClientProxy,
    ) { }
    /**
     * @description quiz webinar pagination
     * API : /quiz/webinar/paginate  
     * Params : not required for user side paginate or
     * */
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: QuizWebinarPaginateInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (postData?.type && postData?.type == 'userSide' && [appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id || 0)) {
                let memberShipCode = postData?.membership_code || req.tokenUser?.membership_code;
                if (memberShipCode == '' || !memberShipCode) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                let where = `qw.id IS NOT NULL AND aqo.status = '1' AND aqo.quiz_id = 0 AND aqo.organization_id = '${memberShipCode}' AND qw.status = 1 AND qw.deleted = 0`;
                if (postData?.search_str && postData?.search_str != '') {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['qw.title', 'qw.vimeo_shareable_link', 'qw.embedded_link']);
                }
                let sortBy = postData?.sort_by || 0;
                let orderBy = postData && postData?.order_by ? postData?.order_by : 'qw.id';
                let order = postData && postData?.order ? postData?.order : 'DESC';
                if (sortBy == 1) {
                    orderBy = 'qw.duration';
                    order = 'ASC';
                }
                if (sortBy == 2) {
                    orderBy = 'qw.title';
                    order = 'ASC';
                }
                if (sortBy == 3) {
                    orderBy = 'qw.title';
                    order = 'DESC';
                }
                if (postData?.duration_max && postData?.duration_min) {
                    const durationMinInSeconds = this.commonDateService.timeToSeconds(postData?.duration_min.toString());
                    const durationMaxInSeconds = this.commonDateService.timeToSeconds(postData?.duration_max.toString());
                    where += ` AND qw.duration BETWEEN ${durationMinInSeconds} AND ${durationMaxInSeconds}`;
                }
                if (postData?.duration_max) {
                    const durationMaxInSeconds = this.commonDateService.timeToSeconds(postData?.duration_max.toString());
                    where += ` AND qw.duration <= ${durationMaxInSeconds}`;
                }
                if (postData?.duration_min) {
                    const durationMinInSeconds = this.commonDateService.timeToSeconds(postData?.duration_min.toString());
                    where += ` AND qw.duration >= ${durationMinInSeconds}`;
                }
                let resultedData = await this.quizWebinarService.userSideWebinarPaginate(
                    ['qw.id', 'qw.title', 'qw.embedded_link', 'qw.duration', 'aqo.id', 'aqo.organization_id', 'qw.created'],
                    where,
                    postData,
                    orderBy,
                    order
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(QuizWebinarDto, resultedData['list'], req.lang)
                );
                if (resultedData['list'] && resultedData['list'].length) {
                    await Promise.all(resultedData['list'].map(async (item) => {
                        if (item?.duration) {
                            let hourTrans = await this.translatorService.frontendReadTranslation(req.lang, 'Hr', `/LC_MESSAGES/Challenge/MyChallenges`, `static`);
                            let minuteTrans = await this.translatorService.frontendReadTranslation(req.lang, 'min');
                            let secondTrans = await this.translatorService.frontendReadTranslation(req.lang, 'Sec');
                            item.duration = this.commonDateService.convertSecondsToHoursAndMinutesAndSeconds(item.duration, 'string', { hour: hourTrans || 'Hr', min: minuteTrans || 'Min', sec: secondTrans || 'Sec' });
                        }
                        if (item?.webinar_date) {
                            item.webinar_date = this.commonDateService.DateTimeFormat(item?.webinar_date, 'MM-DD-YYYY', 'YYYY-MM-DD');
                        }
                        if (item.title) {
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_webinar_title_${item['id']}`, `/LC_MESSAGES/Quizzes/QuizWebinar/0/${item['id']}`, `dynamic`);
                            item.title = (customeName == '' || customeName == `quiz_webinar_title_${item['id']}`) ? item['title'] : customeName;
                        }
                        if (item.description) {
                            let customeDescription = await this.translatorService.frontendReadTranslation(req.lang, `quiz_webinar_description_${item['id']}`, `/LC_MESSAGES/Quizzes/QuizWebinar/0/${item['id']}`, `dynamic`);
                            item.description = (customeDescription == '' || customeDescription == `quiz_webinar_description_${item['id']}`) ? item['description'] : customeDescription;
                        }
                    }))
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: "Success",
                });
            }
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let where = `qw.id IS NOT NULL AND qw.deleted = 0 AND qw.status IN (0,1)`;
            if (postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['qw.title', 'qw.vimeo_shareable_link', 'qw.embedded_link']);
            }
            let resultedData = await this.quizWebinarService.paginateList(
                ['qw'],
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuizWebinarDto, resultedData['list'], req.lang)
            );
            if (resultedData['list'] && resultedData['list'].length) {
                await Promise.all(resultedData['list'].map(async (item) => {
                    if (item?.duration) {
                        item.duration = this.commonDateService.secondsToTime(item.duration);
                    }
                    if (item?.webinar_date) {
                        item.webinar_date = this.commonDateService.DateTimeFormat(item?.webinar_date, 'MM-DD-YYYY', 'YYYY-MM-DD');
                    }
                    if (item.title) {
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_webinar_title_${item['id']}`, `/LC_MESSAGES/Quizzes/QuizWebinar/0/${item['id']}`, `dynamic`);
                        item.title = (customeName == '' || customeName == `quiz_webinar_title_${item['id']}`) ? item['title'] : customeName;
                    }
                    if (item.description) {
                        let customeDescription = await this.translatorService.frontendReadTranslation(req.lang, `quiz_webinar_description_${item['id']}`, `/LC_MESSAGES/Quizzes/QuizWebinar/0/${item['id']}`, `dynamic`);
                        item.description = (customeDescription == '' || customeDescription == `quiz_webinar_description_${item['id']}`) ? item['description'] : customeDescription;
                    }
                }))
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: "Success",
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /**
    * @description quiz webinar creation
    * API : /quiz/webinar/create 
    * Params : title, embedded_link, duration (HH:MM:SS), webinar_date (YYYY-MM-DD)
    * */
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: QuizWebinarCreateInput) {
        try {
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.title || !postData?.embedded_link || !postData?.duration) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (postData?.title) {
                const checkExist = await this.quizWebinarService.findOne({ title: postData?.title.trim(), status: Not(2) });
                if (checkExist) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_DUPLICATE_ENTRY"));
                }
            }
            let durationSecond = 0;
            if (postData?.duration) {
                durationSecond = this.commonDateService.timeToSeconds(postData?.duration.toString());
            }
            delete postData.duration;
            let data = {
                ...postData,
                duration: durationSecond,
                created_by: req.tokenUser?.id,
            }
            let saveData = await this.quizWebinarService.save(data);
            let dynamicDatas = Object.create(null);
            if (postData?.title) {
                let tilte = `quiz_webinar_title_${saveData['id']}`
                dynamicDatas[`${tilte}`] = postData?.title;
            }
            if (postData?.description) {
                let tilte = `quiz_webinar_description_${saveData['id']}`
                dynamicDatas[`${tilte}`] = postData?.description;
            }
            await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'QuizWebinar', saveData?.id);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /**
    * @description quiz webinar update
    * API : /quiz/webinar/update 
    * Params : id, title, embedded_link, duration (HH:MM:SS), webinar_date (YYYY-MM-DD)
    * */
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: QuizWebinarCreateInput) {
        try {
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let recordDetails = await this.quizWebinarService.findOne({ id: postData?.id });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (postData?.title) {
                const checkExist = await this.quizWebinarService.findOne({ id: Not(postData?.id), title: postData?.title.trim(), status: Not(2) });
                if (checkExist) {
                    throw Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Webinar title'));
                }
            }
            if (recordDetails.is_default === 1) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_ACCESS_DENIED'));
            }
            let durationSecond: number | undefined = undefined;
            if (postData.duration) {
                durationSecond = this.commonDateService.timeToSeconds(
                    postData.duration.toString()
                );
            }
            delete postData.duration;
            await this.quizWebinarService.update(
                { id: postData.id },
                {
                    ...postData,
                    ...(durationSecond !== undefined && { duration: durationSecond }),
                    updated_by: req.tokenUser?.id
                }
            );
            let dynamicDatas = Object.create(null);
            if (postData?.title) {
                let tilte = `quiz_webinar_title_${postData['id']}`
                dynamicDatas[`${tilte}`] = postData?.title;
            }
            if (postData?.description) {
                let tilte = `quiz_webinar_description_${postData['id']}`
                dynamicDatas[`${tilte}`] = postData?.description;
            }
            await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'QuizWebinar', postData?.id);
            this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_WEBINAR, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /**
    * @description quiz webinar deletion
    * API : /quiz/webinar/delete 
    * Params : id
    * */
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: QuizWebinarDeleteInput) {
        try {
            if (![appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id) || !postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizWebinarService.findOne({
                id: postData?.id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (recordDetails.is_default === 1) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_ACCESS_DENIED'));
            }
            await this.quizWebinarService.update({ id: postData?.id }, { status: 2, updated_by: req.tokenUser?.id, deleted: 1 });
            const titleKey = `quiz_webinar_title_${postData['id']}`
            let descriptionKey = `quiz_webinar_description_${postData['id']}`
            const dynamicData = {
                [titleKey]: titleKey,
                [descriptionKey]: descriptionKey
            };
            await this.translatorService.DynamicEngJsonData(
                'Quizzes',
                '0',
                dynamicData,
                'Delete',
                'QuizWebinar',
                postData?.id
            );
            this.activityLogService.create(recordDetails, { status: 2, deleted: 1, updated_by: req.tokenUser?.id }, tableConstant.QUIZ.TBL_QZ_WEBINAR, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /**
    * @description quiz webinar get-one
    * API : /quiz/webinar/get-one 
    * Params : id
    * */
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: QuizWebinarGetOneInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quizWebinarService.findOne({ id: postData?.id, status: Not(2) });
            if (!resultedData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizWebinarDto, resultedData, req.lang)
            );
            if (resultedData?.duration) {
                resultedData.duration = this.commonDateService.secondsToTime(resultedData?.duration || 0);
            }
            if (resultedData?.webinar_date) {
                resultedData.webinar_date = this.commonDateService.DateTimeFormat(resultedData?.webinar_date, 'MM-DD-YYYY', 'YYYY-MM-DD');
            }
            if (resultedData.title) {
                let customeName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_webinar_title_${resultedData['id']}`, `/LC_MESSAGES/Quizzes/QuizWebinar/0/${resultedData['id']}`, `dynamic`);
                resultedData.title = (customeName == '' || customeName == `quiz_webinar_title_${resultedData.id}`) ? resultedData['title'] : customeName;
            }
            if (resultedData.description) {
                let customeDescription = await this.translatorService.frontendReadTranslation(req.lang, `quiz_webinar_description_${resultedData['id']}`, `/LC_MESSAGES/Quizzes/QuizWebinar/0/${resultedData['id']}`, `dynamic`);
                resultedData.description = (customeDescription == '' || customeDescription == `quiz_webinar_description_${resultedData.id}`) ? resultedData['description'] : customeDescription;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /**
    * @description quiz webinar list
    * API : /quiz/webinar/list 
    * Params : not required
    * */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: QuizWebinarListInput) {
        try {
            let where: any = {
                status: 1,
                deleted: 0,
            };
            const order = postData && postData?.order ? postData?.order : 'ASC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let fields = [];
            if (postData?.type && postData?.type == 'translation') {
                fields = ['qw.id', 'qw.title'];
            } else {
                fields = ['qw.id', 'qw.title', 'qw.embedded_link'];
            }
            if (postData?.organization_id && postData?.organization_id > 0) {
                const companyCode = await this.frontService.companyFindOne(
                    ['code'],
                    { id: postData?.organization_id }
                );
                let whereCondition = `qw.status = 1 AND qw.deleted = 0 AND aqo.status = 1 AND aqo.quiz_id = 0 AND aqo.organization_id = '${companyCode?.code}'`;
                const quizzesDetailsData = await this.quizWebinarService.listRecord
                    (
                        fields,
                        whereCondition,
                        { [orderBy]: order },
                        [tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG]
                    );
                let result = <any>(
                    await this.commonArrayService.formatToDto(QuizWebinarDto, quizzesDetailsData, req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: result,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                });
            }
            let result = await this.quizWebinarService.listRecord(fields, where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(QuizWebinarDto, result, req.lang)
            );
            if (postData?.type && postData?.type == 'translation') {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: result,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                });
            }
            result = result?.filter((item) => item?.embedded_link && item?.embedded_link.trim() !== '');
            if (result && result?.length && (req.tokenUser?.role_id !== appConstant.ROLE.ADMIN)) {
                await Promise.all(result.map(async (item) => {
                    if (item.title) {
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_webinar_title_${item['id']}`, `/LC_MESSAGES/Quizzes/QuizWebinar/0/${item['id']}`, `dynamic`);
                        item.title = (customeName == '' || customeName == `quiz_webinar_title_${item['id']}`) ? item['title'] : customeName;
                    }
                }))
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /**
    * @description quiz webinar map default webinars
    * API : /quiz/webinar/map-default-webinars 
    * Params : not required
    * */
    @Post('map-default-webinars')
    async mapDefaultWebinars(@Req() req: Request, @Res() res: Response, @Body() postData: QuizWebinarCreateInput) {
        try {
            if (req.tokenUser?.role_id !== appConstant.ROLE.ADMIN) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let dataFromBucket = await lastValueFrom(this.commonMicroservice.send({ cmd: 'get_file' }, { path: `quiz/webinar/default/defaultwebinars.json`, userBucket: 'private' }))
            if (dataFromBucket) {
                dataFromBucket = Buffer.from(dataFromBucket.Body, 'base64').toString('utf-8');
                let jsonData = JSON.parse(dataFromBucket);
                for (const webinar of jsonData) {
                    if (!webinar?.title || !webinar?.embedded_link) {
                        continue;
                    }
                    let checkExist = await this.quizWebinarService.findOne({ title: webinar?.title.trim(), status: Not(2) });
                    if (checkExist) {
                        continue;
                    }
                    let durationSecond = 0;
                    if (webinar?.duration && webinar?.duration != '') {
                        durationSecond = this.commonDateService.timeToSeconds(webinar?.duration);
                    }
                    let data = {
                        title: webinar?.title,
                        embedded_link: webinar?.embedded_link,
                        webinar_date: webinar?.webinar_date,
                        duration: durationSecond || 0,
                        is_default: 1,
                        created_by: req.tokenUser?.id,
                    }
                    let saveData = await this.quizWebinarService.save(data);
                    let dynamicDatas = Object.create(null);
                    if (webinar?.title) {
                        let tilte = `quiz_webinar_title_${saveData['id']}`
                        dynamicDatas[`${tilte}`] = webinar?.title;
                    }
                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'QuizWebinar', saveData?.id);
                }
            }
            else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILE_NOT_FOUND'));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message,
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
