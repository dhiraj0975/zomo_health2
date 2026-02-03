import { CategoryService } from '@/modules/activity/category/category.service';
import { CompanyService } from '@/modules/company/companies/company.service';
import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { appConstant, CommonArrayService, CommonDateService, CommonService, QuizAssignQuizOrgDto, tableConstant } from '@common-constants';
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
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Between, In, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateAssignQuizOrgInput,
    DeleteAssignQuizOrgInput,
    GetoneAssignQuizOrgInput,
    PaginateWithCompanyInput,
    UpdateAssignQuizOrgInput
} from "../../../input";
import { ActivityService } from "../../activity/activity/activity.service";
import { TranslationService } from "../../translation/translation.service";
import { FrontService } from "../front/front.service";
import { QuizQuizzesService } from '../quizzes/quizzes.service';
import { UserDetailsService } from "../userdetails/userdetails.service";
import { QuizWebinarService } from '../webinar/quizwebinar.service';
import { QuizAssignQuizOrgService } from './assignquizorgs.service';
import { ListAssignQuizOrgInput } from './input/listassignquizorg.input';
const S3_URL =  process.env.S3_URL_PROD
@Controller('quiz/assign-quiz-org')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class QuizAssignQuizOrgController {
    constructor(
        @Inject('TIMEZONE_SERVICE')
        private client: ClientProxy,
        private readonly quizAssignQuizOrgService: QuizAssignQuizOrgService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly quizQuizzesService: QuizQuizzesService,
        private readonly activityLogService: ActivityLogService,
        private readonly userDetailsService: UserDetailsService,
        private readonly activityService: ActivityService,
        private readonly frontService: FrontService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly quizWebinarService: QuizWebinarService,
        private readonly notificationsController: NotificationsController,
        private readonly companyService: CompanyService,
        private readonly categoryService: CategoryService,
    ) { }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            // type assignWebinar = list of assigned webinar to organizations
            // type assignAllWebinar = list of assigned quiz to organizations
            postData = this.commonService.sanitizePayload(postData);
            if (postData?.type && (postData?.type == 'assignWebinar' || postData?.type == 'assignAllWebinar' || postData?.type == 'assignWebinarQuiz' || postData?.type == 'assignAllWebinarQuiz')) {
                let where = `company.status = 1 AND aqo.is_webinar = 1 AND aqo.status = 1 AND aqo.quiz_type = 1`;
                if (postData?.type == 'assignWebinar') {
                    if (!postData?.webinar_id) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                    }
                    let checkWebinar = await this.quizWebinarService.findOne(
                        { id: Number(postData?.webinar_id), status: 1, deleted: 0 }
                    );
                    if (!checkWebinar) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_WEBINAR_NOT_FOUND"));
                    }
                    where += ` AND aqo.webinar_id = ${postData?.webinar_id}`
                }
                if (postData?.quiz_id && Number(postData?.quiz_id) > 0 && postData?.type == 'assignWebinarQuiz') {
                    if (!postData?.quiz_id) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                    }
                    let checkQuiz = await this.quizQuizzesService.findOne(
                        { 
                            id: Number(postData?.quiz_id), 
                            status: 1 
                        }
                    );
                    if (!checkQuiz) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_QUIZ_NOT_FOUND"));
                    }
                    where += ` AND aqo.quiz_id = ${postData?.quiz_id}`;
                }
                else if (postData?.type == 'assignAllWebinarQuiz') {
                    let webinarQuizList = await this.quizQuizzesService.listRecord(
                        ['qz.id'],
                        `qz.status = 1 AND qz.is_default = 1 AND qz.webinar_id != 0`,
                        { id: 'ASC' }
                    );
                    const quizIds = webinarQuizList?.map(ele => ele.id) ?? [];
                    if (quizIds.length > 0) {
                        where += ` AND aqo.quiz_id IN (${quizIds.join(',')})`;
                    } else {
                        where += ` AND aqo.quiz_id IN (NULL)`;
                    }
                } else {
                    where += ` AND aqo.quiz_id = 0`;
                }
                if (postData?.type == 'assignAllWebinar') {
                    let allWebinarIds = await this.quizWebinarService.listRecord(
                        ['qw.id'],
                        { status: 1, deleted: 0 },
                        { id: 'ASC' }
                    );
                    where += ` AND aqo.webinar_id IN (${allWebinarIds?.map(ele => ele.id)?.join(',')})`;
                }
                if (postData?.search_str && postData?.search_str != '') {
                    where += ` AND company.company_name LIKE '%${postData?.search_str}%'`
                }
                let resultedData = await this.quizAssignQuizOrgService.paginateWebinarList(
                    ['aqo.id', 'aqo.webinar_id', 'aqo.organization_id', 'company.id', 'company.company_name'],
                    where,
                    postData,
                    `aqo.organization_id`
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(QuizAssignQuizOrgDto, resultedData['list'], req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                });
            }
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `aqo.status != 2` : `aqo.status = '1'`;
            where += ` AND aqo.quiz_id != 0 AND aqo.quiz_type = 0`;
            if (postData?.filter_by?.toLowerCase() == 'organization') {
                where += ` AND company.company_name LIKE '%${postData?.search_str}%'`
            }
            if (postData?.filter_by?.toLowerCase() == 'quiz') {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str, 'quiz.quiz_name');
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) {
                let resultedData = await this.clientManagerAssignService.listRecord({ user_id: req.tokenUser?.id, status: 1 }, null);
                if (resultedData.length > 0) {
                    where += `AND company.id IN (${resultedData.map(ele => ele.org_id).join(',')})`;
                } else {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: {
                            list: [],
                            limit: postData?.limit,
                            page: postData?.page,
                            pages: 0,
                            total: 0
                        },
                        message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                    });
                }
            }
            let resultedData = await this.quizAssignQuizOrgService.paginateList(
                ['aqo.id', 'aqo.status', 'aqo.organization_id' ,'quiz.id', 'quiz.quiz_name', 'company.id', 'company.company_name', 'company.code'],
                where,
                postData,
                [tableConstant.QUIZ.TBL_QZ_QUIZZES, tableConstant.COMPANIES.TBL_COMPANY]
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuizAssignQuizOrgDto, resultedData['list'], req.lang)
            );
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
                    data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssignQuizOrgInput) {
        try {
            // type assignWebinar = assign webinar to organizations
            // type assignAllWebinar = assign all webinar quiz to organizations Or sleected mulptiple webinars assign to organizations
            // type assignAllWebinarQuiz = assign all webinar quiz to organizations or selected multiple webinars quiz assign to organizations
            const categoryQuiz = await this.categoryService.findOne({
                category_name: 'Quiz',
            });
            const categoryWebinar = await this.categoryService.findOne({
                category_name: 'Webinar Videos',
            });
            const categoryWebinarQuiz = await this.categoryService.findOne({
                category_name: 'Webinar Quiz',
            });
            const categoryQuizId = categoryQuiz ? categoryQuiz.id : null;
            const categoryWebinarId = categoryWebinar ? categoryWebinar.id : null;
            const categoryWebinarQuizId = categoryWebinarQuiz ? categoryWebinarQuiz.id : null;
            if (postData?.type && (postData?.type == 'assignWebinar' || postData?.type == 'assignAllWebinar')) {
                if (!postData?.organization_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                if (postData?.type == 'assignWebinar' && (!postData?.webinar_id || postData?.webinar_id == null || postData?.is_webinar !== 1)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                if (postData?.type == 'assignAllWebinar') {
                    if (postData?.webinar_id && postData?.webinar_id !== null && postData?.webinar_id != 0) {
                        postData.webinar_id = postData?.webinar_id;
                    } else {
                        let where: any = {
                            status: 1,
                            deleted: 0,
                        };
                        let webinarList = await this.quizWebinarService.listRecord(['qw.id'], where, { id: 'ASC' });
                        if (webinarList.length == 0) {
                            throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND"));
                        }
                        postData.webinar_id = webinarList.map(ele => ele.id).toString();
                    }
                }
                let webinarArray = this.commonArrayService.transformToArray(postData?.webinar_id, ',');
                let webinarLists = {};
                let message = 'success', successStatus = 1
                for (let webinarId of webinarArray) {
                    let checkWebinar = await this.quizWebinarService.findOne({ id: Number(webinarId), status: 1, deleted: 0 });
                    if (!checkWebinar) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_WEBINAR_NOT_FOUND"));
                    }
                    webinarLists[webinarId] =
                    {
                        embedded_link: checkWebinar?.embedded_link,
                        title: checkWebinar?.title
                    };
                }
                for (let webinarId of webinarArray) {
                    if (categoryWebinarId) {
                        let activityData = await this.activityService.activityFindOne({ activity_name: webinarLists[webinarId]?.title, category_id: categoryWebinarId }, ['id']);
                        if (!activityData) {
                            let data = {
                                category_id: categoryWebinarId,
                                activity_name: webinarLists[webinarId]?.title,
                                accebility: '0',
                                status: '1'
                            }
                            let saveData = await this.activityService.save({ ...data })
                            postData.activity_id = saveData['id'];
                        } else {
                            postData.activity_id = activityData.id;
                        }
                    }
                    let assignDetails = {
                        webinar_id: webinarId,
                        is_webinar: 1,
                        vlink: webinarLists[webinarId]?.embedded_link || '',
                        quiz_id: 0,
                        status: 1,
                        time_dependent: 0,
                        timer_type: 0,
                        publish_result: 0,
                        vmsg: '',
                        activity_id: 0,
                        allow_retakes: 0,
                        retakes: 0,
                        quiz_time: '00:00:00',
                        is_hire: 0,
                        is_timezone: 0,
                        quiz_type: 1,
                        is_popup: 0,
                    };
                    let organizationIds = postData?.organization_id.split(',');
                    for (let i = 0; i < organizationIds.length; i++) {
                        assignDetails['organization_id'] = organizationIds[i];
                        const recordDetails = await this.quizAssignQuizOrgService.findOne({ status: 1, quiz_id: 0, webinar_id: webinarId, organization_id: organizationIds[i] });
                        if (recordDetails) {
                            const translation = await this.translatorService.frontendReadTranslation(req.lang, "ERR_ORG_ALREADY_ASSIGNED");
                            message = translation.replace('%s', 'Webinar');
                            successStatus = 0;
                            continue;
                        }
                        await this.quizAssignQuizOrgService.save({ ...assignDetails });
                        // would be implemented in future notification module
                        // this.addNotification({
                        //     org_id: assignDetails['organization_id'], 
                        //     user_id: 0, 
                        //     custom_cname: recordDetails?.['quiz']?.quiz_name, 
                        //     quiz_id: assignDetails['quiz_id'], 
                        //     webinar_id: assignDetails['webinar_id'], 
                        //     logo: null, 
                        //     type: 'add',
                        //     url: `https://${process.env.DOMAIN}/quizzes`,
                        //     start_date: postData?.start_date,
                        //     end_date: postData?.end_date
                        // }, req);
                    }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: successStatus,
                    error: 0,
                    data: null,
                    message: message
                });
            }
            if ((!postData?.quiz_id || !postData?.organization_id) && (!postData?.type || postData?.type != 'assignAllWebinarQuiz')) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let webinarObject: { [key: string]: number } = Object.create(null);
            if (postData?.type && postData?.type == 'assignAllWebinarQuiz') {
                if (postData?.quiz_id && postData?.quiz_id !== null && postData?.quiz_id != 0) {
                    postData.quiz_id = postData?.quiz_id;
                    let QuizIdsArray = this.commonArrayService.transformToArray(postData?.quiz_id, ',');
                    let webinarQuizList = await this.quizQuizzesService.listRecord(['qz.id', 'qz.webinar_id'], `qz.id IN (${QuizIdsArray.join(',')}) AND qz.status = 1 AND qz.is_default = 1 AND qz.webinar_id != 0`, { id: 'DESC' });
                    postData.quiz_id = webinarQuizList?.map(ele => ele.id).toString();
                    webinarObject = webinarQuizList?.reduce((acc, curr) => {
                        acc[String(curr.id)] = curr?.webinar_id;
                        return acc;
                    }, {});
                } else {
                    let where: any = `qz.status = 1 AND qz.is_default = 1 AND qz.webinar_id != 0`;
                    let webinarQuizList = await this.quizQuizzesService.listRecord(['qz.id', 'qz.webinar_id'], where, { id: 'DESC' });
                    if (webinarQuizList.length == 0) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND"));
                    }
                    postData.quiz_id = webinarQuizList?.map(ele => ele.id).toString();
                    webinarObject = webinarQuizList?.reduce((acc, curr) => {
                        acc[String(curr.id)] = curr?.webinar_id;
                        return acc;
                    }, {});
                }
            }
            if (postData?.is_webinar && postData?.is_webinar == 1 && postData?.type !== 'assignAllWebinarQuiz') {
                if (postData?.webinar_id == null || postData?.webinar_id == 0) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (postData?.webinar_id && Number(postData?.webinar_id) > 0) {
                let checkWebinar = await this.quizWebinarService.findOne({ id: Number(postData?.webinar_id), status: 1, deleted: 0 });
                if (!checkWebinar) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_WEBINAR_NOT_FOUND"));
                }
                postData.vlink = checkWebinar?.embedded_link;
            }
            let videoLinkObject: { [key: string]: string } = Object.create(null);
            if (postData?.type && postData?.type == 'assignAllWebinarQuiz') {
                let webinarIds = Object.values(webinarObject).filter((value) => value != 0).map(Number);
                let where: any = {
                    status: 1,
                    deleted: 0,
                    id: In(webinarIds)
                };
                let checkWebinar = await this.quizWebinarService.listRecord(['qw.id', 'qw.title', 'qw.embedded_link'], where);
                if (!checkWebinar) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_WEBINAR_NOT_FOUND"));
                }
                videoLinkObject = checkWebinar?.reduce((acc, curr) => {
                    acc[String(curr.id)] = curr?.embedded_link;
                    return acc;
                }, {});
            }
            let message = 'success', successStatus = 1
            let organizationIds = postData?.organization_id.split(',');
            let quizIds = this.commonArrayService.transformToArray(postData?.quiz_id, ',');
            if (postData?.start_date) {
                let data = postData?.start_date.split('-');
                postData.start_date = `${data[1]}/${data[2]}/${data[0]}`
            }
            if (postData?.end_date) {
                let data = postData?.end_date.split('-');
                postData.end_date = `${data[1]}/${data[2]}/${data[0]}`;
            }
            postData.retakes = postData?.retakes ?? 1;
            postData.timer_type = postData?.timer_type ?? 0;
            postData.quiz_time = postData?.quiz_time ?? '00:00:00';
            for (let i = 0; i < organizationIds.length; i++) {
                for (let j = 0; j < quizIds?.length; j++) {
                    const recordDetails = await this.quizAssignQuizOrgService.findOne({ quiz_id: quizIds[j], organization_id: organizationIds[i], status: '1' });
                    if (recordDetails) {
                        const translation = await this.translatorService.frontendReadTranslation(req.lang, "ERR_ORG_ALREADY_ASSIGNED");
                        message = translation.replace('%s', 'Quiz');
                        successStatus = 0;
                        continue;
                    }
                    postData.quiz_id = quizIds[j];
                    postData.organization_id = organizationIds[i];
                    if (postData?.type && postData?.type == 'assignAllWebinarQuiz') {
                        postData.webinar_id = webinarObject[String(quizIds[j])] ?? 0;
                        postData.is_webinar = 1;
                        postData.vlink = videoLinkObject[String(postData.webinar_id)] ?? '';
                        postData.quiz_type = 1;
                    }else{
                        postData.vlink = postData?.vlink ?? '';
                    }
                    if(postData?.type && postData?.type == 'assignWebinarQuiz'){
                        postData.webinar_id = postData?.webinar_id ?? 0;
                        postData.is_webinar = 1;
                        postData.quiz_type = 1;
                    }
                    let findQuizName = await this.quizQuizzesService.findOne({ id: postData?.quiz_id }, { id: 'DESC' });
                    if (postData?.type && (postData?.type == 'assignAllWebinarQuiz' || postData?.type == 'assignWebinarQuiz') && categoryWebinarQuizId) {
                        let activityData = await this.activityService.activityFindOne({ activity_name: findQuizName.quiz_name, category_id: categoryWebinarQuizId }, ['id']);
                        if (!activityData) {
                            let data = {
                                category_id: categoryWebinarQuizId,
                                activity_name: findQuizName.quiz_name,
                                accebility: '0',
                                status: '1'
                            }
                            let saveData = await this.activityService.save({ ...data })
                            postData.activity_id = saveData['id'];
                        } else {
                            postData.activity_id = activityData.id;
                        }
                    } else {
                        let activityData = await this.activityService.activityFindOne({ activity_name: findQuizName.quiz_name, category_id: '36' }, ['id']);
                        if (!activityData) {
                            let data = {
                                category_id: '36',
                                activity_name: findQuizName.quiz_name,
                                accebility: '0',
                                status: '1'
                            }
                            let saveData = await this.activityService.save({ ...data })
                            postData.activity_id = saveData['id'];
                        } else {
                            postData.activity_id = activityData.id;
                        }
                    }
                    let quizData = await this.quizAssignQuizOrgService.save({ ...postData });
                    this.addNotification({
                        id: quizData?.['id'],
                        org_id: quizData?.['organization_id'],
                        user_id: 0,
                        custom_cname: recordDetails?.['quiz']?.quiz_name,
                        quiz_id: quizData?.['quiz_id'],
                        webinar_id: quizData?.['webinar_id'],
                        logo: recordDetails?.['quiz']?.image ? S3_URL + recordDetails?.['quiz']?.image : null,
                        type: 'add',
                        url: `https://${process.env.DOMAIN}/quizzes`,
                        start_date: postData?.start_date,
                        end_date: postData?.end_date
                    }, req);
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: successStatus,
                error: 0,
                data: null,
                message: message
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateAssignQuizOrgInput) {
        try {
            const categoryQuiz = await this.categoryService.findOne({
                category_name: 'Quiz',
            });
            const categoryWebinar = await this.categoryService.findOne({
                category_name: 'Webinar Videos',
            });
            const categoryWebinarQuiz = await this.categoryService.findOne({
                category_name: 'Webinar Quiz',
            });
            const categoryQuizId = categoryQuiz ? categoryQuiz.id : null;
            const categoryWebinarId = categoryWebinar ? categoryWebinar.id : null;
            const categoryWebinarQuizId = categoryWebinarQuiz ? categoryWebinarQuiz.id : null;
            if (postData?.type && (postData?.type == 'assignAllWebinar' || postData?.type == 'assignAllWebinarQuiz')) {
                if (!postData?.organization_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                if(postData?.type == 'assignAllWebinar' && (postData?.webinar_id == null || postData?.webinar_id == undefined)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                if(postData?.type == 'assignAllWebinarQuiz' && (postData?.quiz_id == null || postData?.quiz_id == undefined)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if (!postData?.id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
            }
            if (postData?.type && postData?.type == 'assignAllWebinar') {
                let where = `aqo.is_webinar = 1 AND aqo.status = 1`;
                where += ` AND aqo.organization_id = '${postData?.organization_id}' AND aqo.webinar_id != 0 AND aqo.quiz_id = 0`;
                let recordDetails = await this.quizAssignQuizOrgService.orgQuizListRecord(['aqo'], where, { 'aqo.id': 'ASC' })
                if (!recordDetails?.length) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
                }
                let whereWebinar: any = {
                    status: 1,
                    deleted: 0,
                };
                let webinarList = await this.quizWebinarService.listRecord(['qw.id', 'qw.embedded_link', 'qw.title'], whereWebinar, { id: 'ASC' });
                if (webinarList.length == 0) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND"));
                }
                let oldAssignedWebinarsArray = recordDetails?.map(ele => ele.webinar_id) || [];
                let webinarArray = this.commonArrayService.transformToArray(postData?.webinar_id, ',');
                let newAssignedWebinarsArray = webinarArray?.map(ele => Number(ele)) || [];
                let webinarsToBeAdded = newAssignedWebinarsArray.filter(x => !oldAssignedWebinarsArray.includes(x));
                let webinarsToBeRemoved = oldAssignedWebinarsArray.filter(x => !newAssignedWebinarsArray.includes(x));
                for (let webinarId of webinarsToBeRemoved) {
                    await this.quizAssignQuizOrgService.update({ organization_id: postData?.organization_id, webinar_id: webinarId, status: 1 }, { status: 2 });
                    let recordUpdateDetails = recordDetails.find(r => r.webinar_id === webinarId);
                    this.activityLogService.create(recordUpdateDetails, postData, tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG, req.tokenUser?.id);
                }
                for (let webinarId of webinarsToBeAdded) {
                    if (categoryWebinarId) {
                        let activityData = await this.activityService.activityFindOne({ activity_name: webinarList?.find(w => Number(w.id) == Number(webinarId))?.title, category_id: categoryWebinarId }, ['id']);
                        if (!activityData) {
                            let data = {
                                category_id: categoryWebinarId,
                                activity_name: webinarList.find(w => Number(w.id) == Number(webinarId))?.title,
                                accebility: '0',
                                status: '1'
                            }
                            let saveData = await this.activityService.save({ ...data })
                            postData.activity_id = saveData['id'];
                        } else {
                            postData.activity_id = activityData.id;
                        }
                    }
                    let assignDetails = {
                        webinar_id: webinarId,
                        is_webinar: 1,
                        vlink: webinarList.find(w => Number(w.id) == Number(webinarId))?.embedded_link || '',
                        quiz_id: 0,
                        status: 1,
                        time_dependent: 0,
                        timer_type: 0,
                        publish_result: 0,
                        vmsg: '',
                        activity_id: 0,
                        allow_retakes: 0,
                        retakes: 0,
                        quiz_time: '00:00:00',
                        is_hire: 0,
                        is_timezone: 0,
                        is_popup: 0,
                        organization_id: postData?.organization_id,
                        quiz_type: 1,
                    };
                    await this.quizAssignQuizOrgService.save({ ...assignDetails });
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                });
            }
            if (postData?.type && postData?.type == 'assignAllWebinarQuiz') {
                let where = `aqo.is_webinar = 1 AND aqo.status = 1`;
                where += ` AND aqo.organization_id = '${postData?.organization_id}' AND aqo.webinar_id != 0 AND aqo.quiz_id != 0`;
                let recordDetails = await this.quizAssignQuizOrgService.orgQuizListRecord(['aqo'], where, { 'aqo.id': 'ASC' })
                if (!recordDetails?.length) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
                }
                let whereQuiz: any = {
                    status: 1,
                    id: In(recordDetails.map(ele => ele.quiz_id)),
                    is_default: 1,
                    is_webinar: 1,
                    webinar_id: Not(0)
                };
                let webinarQuizList = await this.quizQuizzesService.listRecord(['qz.id'], whereQuiz, { id: 'ASC' });
                if (webinarQuizList.length == 0) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND"));
                }
                let oldAssignedWebinarsQuizArray = webinarQuizList?.map(ele => ele.id) || [];
                let webinarQuizArray = this.commonArrayService.transformToArray(postData?.quiz_id, ',');
                let newAssignedWebinarQuizArray = webinarQuizArray?.map(ele => Number(ele)) || [];
                let webinarQuizsToBeRemoved = oldAssignedWebinarsQuizArray?.filter(x => !newAssignedWebinarQuizArray?.includes(x));
                for (let webinarQuizId of webinarQuizsToBeRemoved) {
                    await this.quizAssignQuizOrgService.update({ organization_id: postData?.organization_id, quiz_id: webinarQuizId, status: 1 }, { status: 2 });
                    let recordUpdateDetails = recordDetails.find(r => r.quiz_id === webinarQuizId);
                    this.activityLogService.create(recordUpdateDetails, postData, tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG, req.tokenUser?.id);
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                });
            }
            if (postData?.start_date) {
                let data = postData?.start_date.split('-');
                postData.start_date = `${data[1]}/${data[2]}/${data[0]}`
            }
            if (postData?.end_date) {
                let data = postData?.end_date.split('-');
                postData.end_date = `${data[1]}/${data[2]}/${data[0]}`
            }
            const recordDetails = await this.quizAssignQuizOrgService.findOne({ id: postData?.id });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            const wasWebinar = recordDetails.is_webinar === 1;
            const isWebinar = postData.is_webinar === 1;
            if (wasWebinar && !isWebinar) {
                postData.webinar_id = 0;
                postData.vlink = '';
                postData.vmsg = postData.vmsg ?? '';
                postData.quiz_type = 0;
            }
            else if (!wasWebinar && !isWebinar) {
                postData.webinar_id = 0;
                postData.vlink = postData.vlink ?? '';
                postData.vmsg = postData.vmsg ?? '';
                postData.quiz_type = 0;
            }
            else if (isWebinar || (wasWebinar && postData?.webinar_id && Number(postData?.webinar_id) > 0 && Number(postData?.webinar_id) !== recordDetails?.webinar_id)) {
                if (!postData.webinar_id || (Number(postData.webinar_id) <= 0)) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                const webinar = await this.quizWebinarService.findOne({
                    id: Number(postData.webinar_id),
                    status: 1,
                    deleted: 0
                });
                if (!webinar) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
                }
                postData.vlink = webinar.embedded_link;
                postData.vmsg = postData.vmsg ?? '';
                postData.quiz_type = 1;
            }
            await this.quizAssignQuizOrgService.update({ id: postData?.id }, { ...postData });
            this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG, req.tokenUser?.id);
            if(postData?.start_date || postData?.end_date){
                let notificationData = {
                    custom_cname: recordDetails?.['quiz']?.quiz_name, 
                    quiz_id: recordDetails['quiz_id'], 
                    webinar_id: recordDetails['webinar_id'], 
                    org_id: recordDetails?.organization_id, 
                    id: recordDetails?.id,
                    type: 'update',
                    url: `https://${process.env.DOMAIN}/quizzes`,
                    logo: recordDetails?.['quiz']?.image ? S3_URL + recordDetails?.['quiz']?.image : null
                };
                if(postData?.start_date){
                    notificationData['start_date'] = postData?.start_date;
                }
                if(postData?.end_date){
                    notificationData['end_date'] = postData?.end_date;                    
                }
                this.addNotification(notificationData, req);
            }
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteAssignQuizOrgInput) {
        try {
            let recordDetails: any;
            if (postData?.type && postData?.type == 'assignWebinar') {
                if (!postData?.id || postData?.webinar_id == null || postData?.webinar_id == 0) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                recordDetails = await this.quizAssignQuizOrgService.findOne({ id: postData?.id, is_webinar: 1, webinar_id: postData?.webinar_id });
                if (!recordDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
                }
                await this.quizAssignQuizOrgService.update({ id: postData?.id, webinar_id: postData?.webinar_id }, { status: 2 });
                this.notificationsController.removeNotification({code: recordDetails?.organization_id, webinar_id: recordDetails?.webinar_id},req);
            } else if (postData?.type && (postData?.type == 'assignAllWebinar' || postData?.type == 'assignAllWebinarQuiz')) {
                if (!postData?.organization_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                let where = `aqo.is_webinar = 1 AND aqo.status = 1`;
                where += ` AND aqo.organization_id = '${postData?.organization_id}'`;
                if (postData?.type == 'assignAllWebinar') {
                    where += ` AND aqo.webinar_id != 0 AND aqo.quiz_id = 0`;
                }
                if (postData?.type == 'assignAllWebinarQuiz') {
                    where += ` AND aqo.quiz_id != 0 AND aqo.webinar_id != 0`;
                }
                recordDetails = await this.quizAssignQuizOrgService.orgQuizListRecord(['aqo'], where, { 'aqo.id': 'ASC' })
                if (!recordDetails?.length) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
                }
                let whereCondition: any = {
                    organization_id: postData?.organization_id,
                    is_webinar: 1,
                };
                if (postData?.type == 'assignAllWebinar') {
                    whereCondition['webinar_id'] = Not(0);
                    whereCondition['quiz_id'] = 0;
                }
                if (postData?.type == 'assignAllWebinarQuiz') {
                    whereCondition['webinar_id'] = Not(0);
                    whereCondition['quiz_id'] = Not(0);
                }
                await this.quizAssignQuizOrgService.update(
                    whereCondition,
                    { status: 2 }
                );
                this.notificationsController.removeNotification({ code: recordDetails?.organization_id }, req);
                recordDetails?.map(ele => this.activityLogService.create(ele, { status: 2 }, tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG, req.tokenUser?.id, 'delete'));
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                });
            }
            else if(postData?.type && postData?.type == 'assignWebinarQuiz') {
                 if (!postData?.id || postData?.quiz_id == null || postData?.quiz_id == 0) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                recordDetails = await this.quizAssignQuizOrgService.findOne(
                    { id: postData?.id, is_webinar: 1, quiz_id: postData?.quiz_id }
                );
                if (!recordDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
                }
                await this.quizAssignQuizOrgService.update({ id: postData?.id, webinar_id: postData?.webinar_id }, { status: 2 });
                this.notificationsController.removeNotification({code: recordDetails?.organization_id, webinar_id: recordDetails?.webinar_id},req);
            } else {
                if (!postData?.id || !postData?.quiz_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                recordDetails = await this.quizAssignQuizOrgService.findOne({
                    id: postData?.id,
                    quiz_id: postData?.quiz_id
                });
                if (!recordDetails) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
                }
                await this.quizAssignQuizOrgService.update({ id: postData?.id, quiz_id: postData?.quiz_id }, { status: 2 });
                this.notificationsController.removeNotification({code: recordDetails?.organization_id, quiz_id: recordDetails?.quiz_id},req);
            }
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG, req.tokenUser?.id, 'delete');
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneAssignQuizOrgInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id };
            if (postData?.organization_id) {
                where['organization_id'] = postData?.organization_id;
            }
            let resultedData = await this.quizAssignQuizOrgService.findOne(where);
            let timezoneDetails: any = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, { id: resultedData.timezone }));
            resultedData['timezone'] = timezoneDetails[0]
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizAssignQuizOrgDto, resultedData, req.lang)
            );
            if (resultedData?.is_webinar && resultedData?.is_webinar == 1 && resultedData?.webinar_id && resultedData?.webinar_id > 0) {
                let checkWebinar = await this.quizWebinarService.findOne({ id: resultedData?.webinar_id, status: 1, deleted: 0 });
                if (checkWebinar) {
                    resultedData['webinar_details'] = {
                        id: checkWebinar.id,
                        title: checkWebinar.title,
                        embedded_link: checkWebinar.embedded_link,
                    };
                }
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
    @Post('quiz-plan')
    async quizPlan(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.date_of_hire = postData?.date_of_hire ?? req.tokenUser?.date_of_hire;
            postData.timezone = postData?.timezone ?? req.tokenUser?.timezone;
            postData.organization_id = postData?.organization_id ?? req.tokenUser?.membership_code;
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            if (!postData?.organization_id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = `aqo.organization_id = '${postData?.organization_id}' AND aqo.retakes != '0' AND aqo.status = '1'`;
            if (postData?.cat_id) {
                where += ` AND qc.id = '${postData?.cat_id}'`;
            }
            let resultedData = await this.quizAssignQuizOrgService.orgQuizListRecord(
                ['qqc.id', 'quiz.cat_id', 'quiz.id', 'quiz.quiz_name', 'quiz.quiz_description', 'quiz.image', 'qc.name', 'qc.id', 'aqo.is_popup', 'aqo.start_date', 'aqo.start_time', 'aqo.publish_result', 'aqo.is_hire', 'aqo.is_timezone', 'aqo.timezone', 'aqo.end_date', 'aqo.end_time', 'aqo.retakes', 'aqo.passing_score', 'aqo.organization_id', 'aqo.vmsg', 'aqo.vlink', 'aqo.activity_id', 'aqo.quiz_time', 'aqo.time_dependent', 'aqo.id', 'aqo.timer_type', 'aqo.created', 'aqo.updated'],
                where,
                { 'aqo.id': 'ASC' },
                [tableConstant.QUIZ.TBL_QZ_QUIZZES, tableConstant.QUIZ.TBL_QZ_CATEGORIES, tableConstant.QUIZ.TBL_QZ_QUIZ_CLICKS],
                postData
            );
            let categoryList = [], categoryId = [], sqlCountReTake = [], sqlCompleted = [];
            let dateOfHireTs: any = await this.commonDateService.DateTimeFormat(postData?.date_of_hire, 'timestamp');
            let userTimeZone: string = postData?.timezone;
            for (let i = 0; i < resultedData.length; i++) {
                let quizName = resultedData[i].quiz.quiz_name;
                let quizDescription = resultedData[i].quiz.quiz_description
                resultedData[i].quiz.quiz_name_temp = resultedData[i].quiz.quiz_name;
                if (quizName) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_name_${resultedData[i].quiz.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData[i].quiz.id}`, `dynamic`);
                    resultedData[i].quiz.quiz_name = (customName == '' || customName == `quiz_name_${resultedData[i].quiz.id}`) ? quizName : customName;
                }
                if (quizDescription) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_description_${resultedData[i].quiz.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData[i].quiz.id}`, `dynamic`);
                    resultedData[i].quiz.quiz_description = (customName == '' || customName == `quiz_description_${resultedData[i].quiz.id}`) ? quizDescription : customName;
                }
                let startDate = await this.commonDateService.DateTimeFormat(resultedData[i].start_date, 'YYYY-MM-DD', 'MM/DD/YYYY');
                let endDate = await this.commonDateService.DateTimeFormat(resultedData[i].end_date, 'YYYY-MM-DD', 'MM/DD/YYYY');
                resultedData[i].start_date = startDate;
                resultedData[i].end_date = endDate;
                let qzStartDateTs: any = await this.commonDateService.DateTimeFormat(resultedData[i].start_date, 'timestamp', 'YYYY-MM-DD');
                let quEndDateTs: any = await this.commonDateService.DateTimeFormat(resultedData[i].end_date, 'timestamp', 'YYYY-MM-DD');
                if (resultedData[i].is_hire == 1 && dateOfHireTs && qzStartDateTs < dateOfHireTs) {
                    let totalDays = Math.floor((quEndDateTs - qzStartDateTs) / (60 * 60 * 24)) + 1;
                    let qzStartDate = await this.commonDateService.DateTimeFormat(dateOfHireTs, 'tstodate', 'YYYY-MM-DD');
                    resultedData[i].start_date = qzStartDate;
                    resultedData[i].end_date = this.commonDateService.getTodayDate(qzStartDate).add(totalDays, 'days').format('YYYY-MM-DD');
                }
                let timezoneDetails = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, { id: resultedData[i].timezone }));
                if (timezoneDetails) {
                    timezoneDetails = timezoneDetails[0];
                }
                let checkStartDate: any = resultedData[i].start_date + ' ' + resultedData[i].start_time;
                let checkEndDate: any = resultedData[i].end_date + ' ' + resultedData[i].end_time;
                const startMoment: any = await this.commonDateService.DateTimeFormat(checkStartDate, 'assignTimezone', 'YYYY-MM-DD HH:mm:ss', timezoneDetails?.timezone_name || 'UTC');
                const endMoment: any = await this.commonDateService.DateTimeFormat(checkEndDate, 'assignTimezone', 'YYYY-MM-DD HH:mm:ss', timezoneDetails?.timezone_name || 'UTC');

                let displayStart = startMoment.clone();
                let displayEnd = endMoment.clone();
                if (resultedData[i].is_timezone && resultedData[i].is_timezone === 1 && userTimeZone) {
                    displayStart = await this.commonDateService.DateTimeFormat(startMoment, 'assignTimezone', undefined, userTimeZone);
                    displayEnd = await this.commonDateService.DateTimeFormat(endMoment, 'assignTimezone', undefined, userTimeZone);
                }

                const checkStartDateUTC = await this.commonDateService.DateTimeFormat(startMoment, 'utcTimeFormat', 'YYYY-MM-DD HH:mm:ss');
                const checkEndDateUTC = await this.commonDateService.DateTimeFormat(endMoment, 'utcTimeFormat', 'YYYY-MM-DD HH:mm:ss');
                const checkCurrentDate: any = await this.commonDateService.DateTimeFormat(new Date(), 'utcTimeFormat', 'YYYY-MM-DD HH:mm:ss');

                resultedData[i].current_date = checkCurrentDate;
                if (resultedData[i].is_timezone && resultedData[i].is_timezone === 1) {
                    resultedData[i].start_date = displayStart.format('YYYY-MM-DD');
                    resultedData[i].start_time = displayStart.format('HH:mm:ss');
                    resultedData[i].end_date = displayEnd.format('YYYY-MM-DD');
                    resultedData[i].end_time = displayEnd.format('HH:mm:ss');
                }
                const checkCurrentDateTs: any = await this.commonDateService.DateTimeFormat(checkCurrentDate, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                const checkEndDateTs: any = await this.commonDateService.DateTimeFormat(checkEndDateUTC, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                if (checkCurrentDateTs > checkEndDateTs) {
                    resultedData.splice(i, 1);
                    i--;
                } else {
                    let where = { quiz_id: resultedData[i].quiz.id, created_date: Between(startDate, endDate), membership_code: postData?.organization_id, user_id: postData?.user_id, status: Not(2) };
                    sqlCountReTake[i] = await this.userDetailsService.listRecord(['COUNT(*) AS count'], { ...where });
                    sqlCompleted[i] = await this.userDetailsService.listRecord(['COUNT(*) AS count'], { ...where, ...{ score: '100.00' } });
                    resultedData[i].balance_retake = resultedData[i].retakes - sqlCountReTake[i][0].count;
                    let score: any = await this.frontService.userDetailsData(['ud.created_date', 'ud.score'], { membership_code: postData?.organization_id, user_id: postData?.user_id, quiz_id: resultedData[i].quiz.id, completed: 'yes' }, { "ud.score": "DESC", "ud.created_date": "DESC" }, null, 'getOne');
                    let checkStartDateTs: any = await this.commonDateService.DateTimeFormat(checkStartDateUTC, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                    if (checkCurrentDateTs >= checkStartDateTs) {
                        let scoreCreatedDate: any = await this.commonDateService.DateTimeFormat(score?.created_date, 'timestamp', 'YYYY-MM-DD HH:mm:ss');
                        if (!score || ((score && scoreCreatedDate < checkStartDateTs) || (score && scoreCreatedDate > checkEndDateTs))) {
                            score = {};
                            score.score = 0;
                        }
                        if (resultedData[i].publish_result == 1 && score.score) {
                            resultedData[i].score = score.score;
                        } else {
                            resultedData[i].score = 0;
                        }
                        if (score?.score) {
                            if (score.score >= resultedData[i].passing_score) {
                                resultedData[i].label_name = 'Passed';
                                resultedData[i].label_status = 1;
                            } else {
                                resultedData[i].label_name = 'Not Passed';
                                resultedData[i].label_status = 2;
                            }
                        } else {
                            if (sqlCountReTake[i][0].count == 0) {
                                resultedData[i].label_name = 'Start';
                                resultedData[i].label_status = 3;
                            } else if ((sqlCountReTake[i][0].count < resultedData[i].retakes) && sqlCountReTake[i][0].count != 0 && sqlCompleted[i][0].count < 1) {
                                resultedData[i].label_name = 'Retake';
                                resultedData[i].label_status = 4;
                            } else {
                                resultedData[i].label_name = 'No More Retake';
                                resultedData[i].label_status = 5;
                            }
                        }
                    } else {
                        resultedData[i].label_name = 'Not Available';
                        resultedData[i].label_status = 6;
                    }
                }
            }
            let categoryResultedData = await this.quizAssignQuizOrgService.orgQuizListRecord(['aqo.id', 'aqo.start_date', 'aqo.start_time', 'aqo.end_date', 'aqo.end_time', 'aqo.is_timezone', 'aqo.timezone', 'aqo.is_hire', 'quiz.id', 'quiz.quiz_name', 'qc.name', 'qc.id'], `aqo.organization_id = '${postData?.organization_id}' AND aqo.retakes != '0' AND aqo.status = '1'`, { 'aqo.id': 'ASC' }, [tableConstant.QUIZ.TBL_QZ_QUIZZES, tableConstant.QUIZ.TBL_QZ_CATEGORIES], postData)
            for (let i = 0; i < categoryResultedData.length; i++) {
                let qzStartDateTs: any = await this.commonDateService.DateTimeFormat(categoryResultedData[i].start_date, 'timestamp', 'MM/DD/YYYY');
                let quEndDateTs: any = await this.commonDateService.DateTimeFormat(categoryResultedData[i].end_date, 'timestamp', 'MM/DD/YYYY');
                if (categoryResultedData[i].is_hire == 1 && dateOfHireTs && qzStartDateTs < dateOfHireTs) {
                    let totalDays = Math.floor((quEndDateTs - qzStartDateTs) / (60 * 60 * 24)) + 1;
                    let qzStartDate = await this.commonDateService.DateTimeFormat(postData?.date_of_hire, 'YYYY-MM-DD');
                    categoryResultedData[i].start_date = qzStartDate;
                    categoryResultedData[i].end_date = this.commonDateService.getTodayDate(qzStartDate).add(totalDays, 'days').format('YYYY-MM-DD');
                }
                let timezoneDetails = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, { id: categoryResultedData[i].timezone }));
                let checkStartDate: any = new Date(categoryResultedData[i].start_date + ' ' + categoryResultedData[i].start_time);
                checkStartDate = await this.commonDateService.DateTimeFormat(new Date(checkStartDate), 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss', timezoneDetails['timezone_name'], 1);
                let checkEndDate: any = new Date(categoryResultedData[i].end_date + ' ' + categoryResultedData[i].end_time);
                checkEndDate = await this.commonDateService.DateTimeFormat(new Date(checkEndDate), 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss', timezoneDetails['timezone_name'], 1);
                if (categoryResultedData[i].is_timezone && categoryResultedData[i].is_timezone === 1) {
                    checkEndDate = await this.commonDateService.DateTimeFormat(new Date(checkEndDate), 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss', userTimeZone, 1);
                }
                let checkCurrentDateTs: any = await this.commonDateService.DateTimeFormat(new Date(), 'timestamp', 'YYYY-MM-DD HH:mm:ss', 'UTC', 1);
                let checkEndDateTs: any = await this.commonDateService.DateTimeFormat(checkEndDate, 'timestamp');
                if (checkCurrentDateTs < checkEndDateTs) {
                    if (!categoryId.includes(categoryResultedData[i].qc.id)) {
                        categoryId.push(categoryResultedData[i].qc.id);
                        let categoryName = categoryResultedData[i].qc.name
                        if (categoryName) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_category_name_${categoryResultedData[i].qc.id}`, `/LC_MESSAGES/Quizzes/Categories/${categoryResultedData[i].qc.id}`, `dynamic`);
                            categoryName = (customName == '' || customName == `quiz_category_name_${categoryResultedData[i].qc.id}`) ? categoryName : customName;
                        }
                        categoryList.push({ id: categoryResultedData[i].qc.id, name: categoryName });
                    }
                }
            }
            resultedData.sort((a, b) => {
                let dateA = new Date(a.start_date).getTime();
                let dateB = new Date(b.start_date).getTime();
                if (dateA === dateB) {
                    return a.quiz.quiz_name_temp.localeCompare(b.quiz.quiz_name_temp);
                }
                return dateA - dateB;
            });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizAssignQuizOrgDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { data: (resultedData.length > 0 ? resultedData : null), category_list: (categoryList.length > 0 ? categoryList : null) },
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListAssignQuizOrgInput) {
        try {
            if (postData?.type && postData?.type == 'assignWebinar') {
                if (!postData?.webinar_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                let resultedData = await this.frontService.quizAssignQuizOrgData(
                    ['company.id AS company_id', 'company.code AS code', 'company.company_name AS company_name', 'aqo.id AS assign_id'],
                    { webinar_id: postData?.webinar_id, status: 1, is_webinar: 1, quiz_type: 1 },
                    { 'aqo.id': 'DESC' },
                    [
                        {
                            'join_table': 'aqo.company',
                            'alias': 'company',
                            'table': tableConstant.COMPANIES.TBL_COMPANY,
                            'on_condition': `aqo.organization_id = company.code`,
                            'join_type': 'inner_one'
                        }
                    ],
                    'getRawMany'
                );
                if (resultedData && resultedData.length) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: resultedData,
                        message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                    });
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: [],
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                });
            }
            if (postData?.type && (postData?.type == 'assignAllWebinar' || postData?.type == 'assignAllWebinarQuiz')) {
                let resultedData;
                if (!postData?.organization_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                if (postData?.type == 'assignAllWebinar') {
                    let whereAllWebinar: any = {
                        status: 1,
                        deleted: 0,
                    };
                    let allWebinarList = await this.quizWebinarService.listRecord(['qw.id', 'qw.title'], whereAllWebinar, { id: 'ASC' });
                    resultedData = await this.frontService.quizAssignQuizOrgData(
                        ['webinar.id AS id'],
                        { organization_id: postData?.organization_id , is_webinar: 1 , webinar_id: Not(0), status: 1, quiz_type: 1 },
                        { 'aqo.id': 'ASC' },
                        [
                            {
                                'join_table': 'aqo.webinar',
                                'alias': 'webinar',
                                'table': tableConstant.QUIZ.TBL_QZ_WEBINAR,
                                'on_condition': `aqo.webinar_id = webinar.id`,
                                'join_type': 'inner_one'
                            }
                        ],
                        'getRawMany'
                    );
                    if (resultedData && resultedData.length == 0) {
                        resultedData = [];
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: resultedData,
                            message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                        });
                    }
                    let finalWebinarList = [];
                    if (allWebinarList && allWebinarList.length) {
                        allWebinarList.forEach(webinarItem => {
                            let isSelected = false;
                            if (resultedData && resultedData.length) {
                                resultedData.forEach(assignedItem => {
                                    if (webinarItem.id == assignedItem.id) {
                                        isSelected = true;
                                    }
                                });
                            }
                            finalWebinarList.push({
                                id: webinarItem.id,
                                title: webinarItem.title,
                                selected: isSelected? 1 : 0
                            });
                        });
                    }
                    resultedData = finalWebinarList;
                    if (resultedData && resultedData.length) {
                        await Promise.all(resultedData.map(async (item) => {
                            if (item.title) {
                                let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_webinar_title_${item['id']}`, `/LC_MESSAGES/Quizzes/QuizWebinar/0/${item['id']}`, `dynamic`);
                                item.title = (customName == '' || customName == `quiz_webinar_title_${item['id']}`) ? item['title'] : customName;
                            }
                        }))
                    }
                } else if (postData?.type == 'assignAllWebinarQuiz') {
                    resultedData = await this.frontService.quizAssignQuizOrgData(
                        ['quiz.id AS id', 'quiz.quiz_name AS quiz_name'],
                        { organization_id: postData?.organization_id , is_webinar: 1 , webinar_id: Not(0) ,status: 1, quiz_id: Not(0), quiz_type: 1 },
                        { 'aqo.id': 'ASC' },
                        [
                            {
                                'join_table': 'aqo.quiz',
                                'alias': 'quiz',
                                'table': tableConstant.QUIZ.TBL_QZ_QUIZZES,
                                'on_condition': `aqo.quiz_id = quiz.id`,
                                'join_type': 'inner_one'
                            }
                        ],
                        'getRawMany'
                    );
                    if (resultedData && resultedData.length) {
                        await Promise.all(resultedData.map(async (ele) => {
                            if (ele.quiz_name) {
                                let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_name_${ele.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${ele['id']}`, `dynamic`);
                                ele.quiz_name = (customName == '' || customName == `quiz_name_${ele.id}`) ? ele.quiz_name : customName;
                            }
                        }));
                    }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                });
            }
            if (!postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.frontService.quizAssignQuizOrgData(['quiz.id AS id', 'quiz.quiz_name AS quiz_name'], { organization_id: postData?.organization_id }, { 'aqo.id': 'ASC' }, [{ 'join_table': 'aqo.quiz', 'alias': 'quiz', 'table': tableConstant.QUIZ.TBL_QZ_QUIZZES, 'on_condition': `aqo.quiz_id = quiz.id`, 'join_type': 'inner_one' }], 'getRawMany');
            if (resultedData && resultedData.length) {
                await Promise.all(resultedData.map(async (ele) => {
                    if (ele.quiz_name) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_name_${ele.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${ele['id']}`, `dynamic`);
                        ele.quiz_name = (customName == '' || customName == `quiz_name_${ele.id}`) ? ele.quiz_name : customName;
                    }
                }));
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
    async addNotification(quizData: any, req: Request) {
        try {
            let organizationDetails = await this.companyService.findOne({ code: quizData?.org_id }, [], ['company.id']);
            quizData.org_id = organizationDetails ? organizationDetails?.id : quizData?.org_id;
            let quizDetails = await this.quizQuizzesService.findOne({ id: quizData?.quiz_id });
            if(quizDetails){
                quizData.logo = S3_URL + quizDetails?.image;
                quizData.custom_cname =  !quizData?.custom_cname || quizData?.custom_cname == ''  ? quizDetails?.quiz_name : quizData?.custom_cname;
            }
            if(quizData?.type == 'add' || quizData?.type == 'update'){
                if(quizData?.type == 'update'){
                    let whereCondition = { org_id: quizData?.org_id };
                    if(quizData?.quiz_id || quizData?.quiz_id == 0){ 
                        whereCondition['quiz_id'] = quizData?.quiz_id;
                    }
                    if(quizData?.webinar_id){
                        whereCondition['webinar_id'] = quizData?.webinar_id;
                    }
                    await this.notificationsController.removeNotification(whereCondition,req);
                }
                let message = `${quizData?.custom_cname} Quiz`;
                let notificationData = {
                    org_id: quizData.org_id,
                    user_id: 0,
                    title: quizData?.title ?? "Upcoming Quiz",
                    message: `${quizData?.custom_cname} Quiz`,
                    type: 1,
                    module_name: 'Quizzes',
                    submodule_name: 'Quiz',
                    metadata: {
                        quiz_id: quizData?.quiz_id,
                        webinar_id: quizData?.webinar_id,
                        id: quizData?.id,
                        logo: quizData?.logo,
                        url: quizData?.url,
                        notification_date: null,
                        notification_sent: 0,
                        notification_sent_count: 0,
                    },
                };
                if(quizData?.start_date || quizData?.end_date){ 
                    if(quizData?.start_date?.includes('/')){
                        quizData.start_date = await this.commonDateService.getTodayDate(quizData?.start_date, 'MM/DD/YYYY')
                    }
                    if(quizData?.end_date?.includes('/')){
                        quizData.end_date = await this.commonDateService.getTodayDate(quizData?.end_date, 'MM/DD/YYYY')
                    }
                    let startDate = this.commonDateService.getTodayDate(quizData?.start_date).format('YYYY-MM-DD');
                    notificationData['metadata']['notification_date'] = startDate;
                    notificationData['metadata']['start_date'] = startDate;
                    notificationData['metadata']['notification_sent'] = 0;
                    notificationData['message'] = message + ' starts Today';
                    await this.notificationsController.sendNotification(0, notificationData, req);
                    
                    if(quizData?.end_date){
                        notificationData['title'] = 'Quiz Expiration';
                        let endDate = this.commonDateService.getTodayDate(quizData?.end_date).format('YYYY-MM-DD');
                        notificationData['metadata']['notification_date'] = endDate;
                        notificationData['metadata']['notification_sent'] = endDate;
                        notificationData['metadata']['notification_sent'] = 1;
                        notificationData['metadata']['end_date'] = endDate;
                        notificationData['message'] = message + ' ends Today';
                        await this.notificationsController.sendNotification(0, notificationData, req);
                    }
                }   
            }
            return;
        }
        catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return
        }
    }
}