import { appConstant, CommonArrayService, CommonFileService, CommonService, QuizQuizzesDto, tableConstant } from '@common-constants';
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
    UploadedFile,
    UploadedFiles,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from "@nestjs/microservices";
import { AnyFilesInterceptor, FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateQuizzesInput,
    DeleteQuizzesInput,
    GetOneQuizzesInput,
    PaginateWithCompanyInput,
    UpdateQuizzesInput
} from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { MyPlanActivityService } from "../../myplan/activity/activity.service";
import { TranslationService } from "../../translation/translation.service";
import { QuizCategoriesService } from '../categories/categories.service';
import { QuizFillUpQuestionService } from '../fillupquestions/fillupquestions.service';
import { FrontService } from "../front/front.service";
import { QuizHotspotQuestionService } from '../hotspotquestions/hotspotquestions.service';
import { QuizMatchingDragDropQuestionService } from '../matchingdragdropquestions/matchingdragdropquestions.service';
import { QuizMatchingDropDownQuestionService } from '../matchingdropdownquestions/matchingdropdownquestions.service';
import { QuizMultipleChoiceQuestionService } from '../multiplechoicequestions/multiplechoicequestions.service';
import { QuizMultipleQuestionService } from '../multiplequestions/multiplequestions.service';
import { QuizMultipleResponseQuestionService } from '../multipleresponsequestions/multipleresponsequestions.service';
import { QuizDetailsService } from "../quizdetails/quizdetails.service";
import { QuizSectionService } from '../quizsections/quizsections.service';
import { QuizTrueFalseQuestionsService } from '../truefalsequestions/truefalsequestions.service';
import { QuizWebinarService } from '../webinar/quizwebinar.service';
import { addDefaultQuizInput } from './input/adddefaultquiz.input';
import { CopyQuizInput } from './input/copyquiz.input';
import { ListQuizInput } from './input/listquiz.input';
import { QuizQuizzesService } from './quizzes.service';
const path = require('path');
@Controller('quiz/quizzes')
@UseGuards(TokenGuard, RoleGuard)
export class QuizQuizzesController {
    constructor(
        private readonly quizQuizzesService: QuizQuizzesService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly quizDetailsService: QuizDetailsService,
        private readonly myPlanActivityService: MyPlanActivityService,
        private readonly frontService: FrontService,
        private readonly quizWebinarService: QuizWebinarService,
        private readonly quizTrueFalseQuestionsService: QuizTrueFalseQuestionsService,
        private readonly quizMultipleChoiceQuestionService: QuizMultipleChoiceQuestionService,
        private readonly quizMultipleResponseQuestionService: QuizMultipleResponseQuestionService,
        private readonly quizMatchingDropDownQuestionService: QuizMatchingDropDownQuestionService,
        private readonly quizHotspotQuestionService: QuizHotspotQuestionService,
        private readonly quizFillUpQuestionService: QuizFillUpQuestionService,
        private readonly quizMatchingDragDropQuestionService: QuizMatchingDragDropQuestionService,
        private readonly quizMultipleQuestionService: QuizMultipleQuestionService,
        private readonly quizCategoriesService: QuizCategoriesService,
        private readonly quizSectionService: QuizSectionService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if(postData?.type && postData?.type == 'webinar'){
                if(!postData?.webinar_id || postData?.webinar_id == 0){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `qs.status != 2` :  `qs.status = 1`;
            if(postData?.type && postData?.type == 'webinar' && postData?.webinar_id && postData?.webinar_id != 0){
                where += ` AND qs.is_webinar = 1 AND qs.webinar_id = ${Number(postData?.webinar_id)}`;
            }else{
                where += ` AND qs.is_webinar = 0 AND qs.webinar_id = 0`;
            }
            if (postData?.search_str) {
                if (postData?.filter_by?.toLowerCase() == 'id') {
                    where += ` AND qs.id = '${this.commonFileService.quoteEscaper(postData?.search_str)}'`;
                }
                if (postData?.filter_by?.toLowerCase() == 'quiz_name') {
                    where += ` AND qs.quiz_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                }
                if (postData?.filter_by?.toLowerCase() == 'quiz_type') {
                    where += ` AND qs.quiz_type LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%'`;
                }
            }
            let fields = ['qs.id','qs.quiz_name','qs.quiz_type','qs.status','qs.is_default'];
            const resultedData = await this.quizQuizzesService.paginateList(
                fields,
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(QuizQuizzesDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.quiz_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_name_${ele.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${ele['id']}`,`dynamic`);
                        ele.quiz_name = (customName == '' || customName == `quiz_name_${ele.id}`) ? ele['quiz_name'] : customName;
                    }
                    if(ele.quiz_description){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_description_${ele.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${ele['id']}`,`dynamic`);
                        ele.quiz_description = (customName == '' || customName == `quiz_description_${ele.id}`) ? ele['quiz_description'] : customName;
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
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('create')
    @UseInterceptors(
        FileInterceptor("image", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.QUIZ_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateQuizzesInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.cat_id || !postData?.quiz_name || !this.commonService.isValidNumber(postData?.question_per_page)) {
                if (file && Object.keys(file).length > 0) {
                    for (let fileData of Object.keys(file)) {
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (postData?.type && postData?.type == 'webinar') {
                if (!postData?.webinar_id || postData?.webinar_id == 0) {
                    if (file && Object.keys(file).length > 0) {
                        for (let fileData of Object.keys(file)) {
                            await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                        }
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (postData?.quiz_name) {
                const checkExist = await this.frontService.quizQuizzesExists({ quiz_name: postData?.quiz_name.trim(), status: Not(2) });
                if (checkExist) {
                    if (file && Object.keys(file).length > 0) {
                        for (let fileData of Object.keys(file)) {
                            await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                        }
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_QUIZ_ALREADY_EXIST"));
                }
            }
            let lastQuizOrder = await this.quizQuizzesService.findOne({},{id: 'DESC'});
            if (!lastQuizOrder) {
                lastQuizOrder['quiz_order'] = 0;
            }
            postData.quiz_order = lastQuizOrder['quiz_order'] + 1;
            /*quiz_type Survey functionality not added */
            postData.quiz_type = postData?.quiz_type ?? 'Normal';
            if(postData?.type && postData?.type == 'webinar'  && postData?.webinar_id && postData?.webinar_id != 0){
                let checkWebinar = await this.quizWebinarService.findOne({ id: Number(postData?.webinar_id), status: 1, deleted: 0 });
                if (!checkWebinar) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_WEBINAR_NOT_FOUND"));
                }
                postData.is_webinar = 1;
                postData.is_default = 0;
            }
            let saveData = await this.quizQuizzesService.save({...postData});
            if (file && file.fieldname === 'image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `quiz/${saveData['id'].toString()}/quiz_${this.commonService.generateMD5(saveData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['image'] = file.filename;
                await this.quizQuizzesService.update({ id: saveData['id'] }, {image: postData['image']});
            }
            let dynamicData = Object.create(null);
            if(postData?.quiz_name){
                let quizName = `quiz_name_${saveData['id']}`
                dynamicData[`${quizName}`]= postData?.quiz_name;
            }
            if(postData?.quiz_description){
                let quizDescription = `quiz_description_${saveData['id']}`
                dynamicData[`${quizDescription}`]= postData?.quiz_description;
            }
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Add','Quizzes',saveData['id']);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_QUIZ_ADD")
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @UseInterceptors(
        FileInterceptor("image", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.QUIZ_ICON_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateQuizzesInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id) {
                if (file && Object.keys(file).length > 0) {
                    for (let fileData of Object.keys(file)) {
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (postData?.quiz_name) {
                const checkExist = await this.frontService.quizQuizzesExists({ quiz_name: postData?.quiz_name.trim(), status: Not(2) });
                if (checkExist) {
                    if (file && Object.keys(file).length > 0) {
                        for (let fileData of Object.keys(file)) {
                            await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                        }
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_QUIZ_ALREADY_EXIST"));
                }
            }
            const recordDetails = await this.quizQuizzesService.findOne({ id: postData?.id });
            if (recordDetails?.is_default == 1) {
                if (file && Object.keys(file).length > 0) {
                    for (let fileData of Object.keys(file)) {
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (postData?.type && postData?.type == 'webinar') {
                if (postData?.webinar_id !== 0) {
                    let checkWebinar = await this.quizWebinarService.findOne({ id: Number(postData?.webinar_id), status: 1, deleted: 0 });
                    if (!checkWebinar) {
                        if (file && Object.keys(file).length > 0) {
                            for (let fileData of Object.keys(file)) {
                                await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                            }
                        }
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_WEBINAR_NOT_FOUND"));
                    }
                    postData.is_webinar = 1;
                    postData.is_default = 0;
                }
            }
            if (file && file.fieldname === 'image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `quiz/${postData?.id.toString()}/quiz_${this.commonService.generateMD5(postData?.id.toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['image'] = file.filename;
            }
            await this.quizQuizzesService.update({ id: postData?.id },{...postData});
            await this.activityLogService.create(recordDetails, postData, tableConstant.QUIZ.TBL_QZ_QUIZZES, req.tokenUser?.id);
            let dynamicData = Object.create(null);
            if(postData?.quiz_name){
                let quizName = `quiz_name_${postData?.id}`
                dynamicData[`${quizName}`]= postData?.quiz_name;
            }
            if(postData?.quiz_description){
                let quizDescription = `quiz_description_${postData?.id}`
                dynamicData[`${quizDescription}`]= postData?.quiz_description;
            }
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Edit','Quizzes',postData?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteQuizzesInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.quizQuizzesService.findOne({
                id: postData?.id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (recordDetails?.is_default == 1) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            await this.quizQuizzesService.update({ id: postData?.id },{status: 2});
            const quizName = `quiz_name_${postData['id']}`
            let quizDescription = `quiz_description_${postData['id']}`
            const dynamicData = {
                [quizName]: quizName,
                [quizDescription]: quizDescription
            };
            await this.translatorService.DynamicEngJsonData('Quizzes','0',dynamicData,'Delete','Quizzes',postData?.id);
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.QUIZ.TBL_QZ_QUIZZES, req.tokenUser?.id, 'delete');
            const quizDetails = await this.quizDetailsService.findOne({quiz_id: postData?.id});
            if (quizDetails) {
                await this.quizDetailsService.update({quiz_id: postData?.id},{status:2});
                let titleKey = `question_name_${postData['id']}`
                let descriptionKey = `question_answer_${postData['id']}`
                const dynamicData = {
                    [titleKey]: titleKey,
                    [descriptionKey]: descriptionKey
                };
                await this.translatorService.DynamicEngJsonData(
                    'Quizzes',
                    '0',
                    dynamicData,
                    'Delete',
                    'Quizzes',
                    postData?.id
                );
                this.activityLogService.create(quizDetails, {status:2}, tableConstant.QUIZ.TBL_QZ_QUIZ_DETAILS, req.tokenUser?.id, 'delete');
            }
            const activityDetails = await this.myPlanActivityService.findOne({ org_activity_id: postData?.id, module_id: 6 });
            if (activityDetails) {
                await this.myPlanActivityService.update({ org_activity_id: postData?.id, module_id: 6 },{status:0});
                this.activityLogService.create(activityDetails, postData, tableConstant.MY_PLAN.TBL_MP_ACTIVITY, req.tokenUser?.id);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneQuizzesInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.quizQuizzesService.findOne({id: postData?.id},null,[tableConstant.QUIZ.TBL_QZ_CATEGORIES]);
            if (!resultedData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(QuizQuizzesDto, resultedData, req.lang)
            );
            if(resultedData.quiz_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_name_${postData?.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData['id']}`,`dynamic`);
                resultedData.quiz_name = (customName == '' || customName == `quiz_name_${postData?.id}`) ? resultedData['quiz_name'] : customName;
            }
            if(resultedData.quiz_description){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_description_${postData?.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${resultedData['id']}`,`dynamic`);
                resultedData.quiz_description = (customName == '' || customName == `quiz_description_${postData?.id}`) ? resultedData['quiz_description'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListQuizInput) {
        try {
            let where: any = { status: '1' };
            let reportCondition = '';
            if (postData?.organization_id) {
                const companyCode = await this.frontService.companyFindOne(['code'], { id: postData?.organization_id });
                const quizzesDetailsData = await this.frontService.quizzesDetailsData(['qz.id', 'qz.quiz_name'], `aqo.organization_id= '${companyCode.code}'`, { 'qz.id': "ASC" }, [{ 'join_table': 'qz.aqo', 'alias': 'aqo', 'table': tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG, 'on_condition': `qz.id = aqo.quiz_id`, 'join_type': 'inner_many' }], 'getMany');
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: quizzesDetailsData,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
                });
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let field = ['qz.id', 'qz.quiz_name', 'qz.created', 'qz.updated'];
            if (postData?.type == 'report') {
                const companyCode = await this.frontService.companyFindOne(
                    ['code'],
                    { id: postData?.org_id }
                );
                reportCondition = `qz.status = 1 AND aqo.organization_id = '${companyCode?.code}'`;
                field = [
                    'qz.id',
                    'qz.quiz_name'
                ];
            }
            if(postData?.type == 'webinar'){
                field.push('qz.is_webinar', 'qz.webinar_id', 'qz.is_default');
                where['is_webinar'] = 1;
                where['webinar_id'] = postData?.webinar_id;
            }
            else if(postData?.type == 'webinarDefault'){
                field.push('qz.is_webinar', 'qz.webinar_id', 'qz.is_default');
                where['is_webinar'] = 1;
                where['is_default'] = 1;
                where['webinar_id'] = Not(0);
            }
            else if(postData?.type == 'allWebinarQuizzes'){
                field.push('qz.is_webinar', 'qz.webinar_id', 'qz.is_default');
                where['is_webinar'] = 1;
                where['webinar_id'] = Not(0);
            }
            else if (postData?.type == 'allQuizzes'){
                field = ['qz.id', 'qz.quiz_name'];
            }
            else{
                where['is_webinar'] = 0;
                where['webinar_id'] = 0;
            }
            let result = await this.quizQuizzesService.listRecord(field, postData?.type == 'report' ? reportCondition : where, { [orderBy]: order }, postData?.type == 'report' ? [tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG] : []);
            result = <any>(
                await this.commonArrayService.formatToDto(QuizQuizzesDto, result, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (result && result.length) {
                    await Promise.all(result.map(async (ele) => {
                        if (ele.quiz_name) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_name_${ele.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${ele['id']}`, `dynamic`);
                            ele.quiz_name = (customName == '' || customName == `quiz_name_${ele.id}`) ? ele['quiz_name'] : customName;
                        }
                        if (ele.quiz_description) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `quiz_description_${ele.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${ele['id']}`, `dynamic`);
                            ele.quiz_description = (customName == '' || customName == `quiz_description_${ele.id}`) ? ele['quiz_description'] : customName;
                        }
                    }));
                }
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
    // API for Adding default quizzes for new webinar
    // default webinar quizz sample json file available at bucket pribvate :- quiz/webinar/default/defaultquiz.json
    @UseInterceptors(
        AnyFilesInterceptor({
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.QUIZ_DEFAULTS_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    @Post('add-default-quiz-webinar')
    async addDefaultQuizWebinar(@Req() req: Request, @Res() res: Response, @Body() postData: addDefaultQuizInput, @UploadedFiles() file: Array<Express.Multer.File>) {
        try {
            if (file?.length == 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let filePath = '';
            for (let fileData of file) {
                if (fileData && fileData?.fieldname == 'json_file') {
                    filePath = `${fileData?.path}`;
                    break;
                }
            }
            let jsonData = await this.commonFileService.readFile(filePath);
            if (!jsonData || jsonData.length == 0) {
                for (let fileData of file) {
                    await this.commonFileService.removeFileFromLocal(`${fileData.path}`);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_INVALID_JSON_FILE'));
            }
            let message = '';
            for (let details of jsonData) {
                if (!details?.title || details?.title == '' || !details?.embedded_link || details?.embedded_link == '') {
                    if (!details?.webinar_id || details?.webinar_id == 0) {
                        for (let fileData of file) {
                            await this.commonFileService.removeFileFromLocal(`${fileData.path}`);
                        }
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                    }
                }
                let checkQuizExits = await this.quizQuizzesService.findOne(
                    { 
                        quiz_name: details?.quiz_name?.trim(), 
                        is_webinar: 1, 
                        webinar_id: details?.webinar_id, 
                        status: Not(2) 
                    }
                );
                if (checkQuizExits) {
                    for (let fileData of file) {
                        await this.commonFileService.removeFileFromLocal(`${fileData.path}`);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_WEBINAR_NOT_FOUND"));
                }
                let webinarId = details?.webinar_id;
                if (details?.title && details?.title != '' && details?.embedded_link && details?.embedded_link != '') {
                    const checkExist = await this.quizWebinarService.findOne({ title: details?.title.trim(), embedded_link: details?.embedded_link.trim(), status: Not(2) });
                    if (!checkExist) {
                        for (let fileData of file) {
                            await this.commonFileService.removeFileFromLocal(`${fileData.path}`);
                        }
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_WEBINAR_NOT_FOUND"));
                    }
                    webinarId = checkExist?.id;
                }
                let checkQuiz: any = await this.quizQuizzesService.listRecord(['qz.id', 'qz.quiz_name', 'qz.quiz_order', 'qz.is_default'], `qz.webinar_id = ${webinarId} AND qz.status != 2`, { id: 'DESC' });
                let checkDefaultQuiz = checkQuiz.filter((quiz) => quiz.is_default == 1);
                let quizOrder = 0;
                quizOrder = checkQuiz && checkQuiz.length > 0 ? checkQuiz[0]['quiz_order'] : 0;
                if (checkDefaultQuiz && checkDefaultQuiz.length > 0) {
                    for (let fileData of file) {
                        await this.commonFileService.removeFileFromLocal(`${fileData.path}`);
                    }
                    throw Error((await this.translatorService.frontendReadTranslation(req.lang, 'ERR_FILES_ALREADY_EXIST')).replace('%s', 'Default Quiz for this webinar'));
                }
                let webinarDetails: any = await this.quizWebinarService.findOne({ id: webinarId, status: 1 });
                if (!webinarDetails) {
                    for (let fileData of file) {
                        await this.commonFileService.removeFileFromLocal(`${fileData.path}`);
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_WEBINAR_NOT_FOUND'));
                }
                if (!details?.category_name || !details?.quiz_name || !details?.quiz_description || !this.commonService.isValidNumber(details?.question_per_page) || !this.commonService.isValidNumber(details?.num_of_questions)) {
                    message = await this.translatorService.frontendReadTranslation(req.lang, 'Common_Value_Invalid');
                    continue;
                }
                let category_name = details?.category_name || '';
                let categoryRecord = await this.frontService.quizCategoriesFindOne({ name: category_name.trim(), status: Not(2) });
                let categoryId = categoryRecord ? categoryRecord?.['id'] : 0;
                if (!categoryRecord) {
                    let categoriesData = Object.create(null);
                    categoriesData['name'] = category_name;
                    categoriesData['description'] = details?.category_description || '';
                    categoriesData['status'] = 1;
                    categoriesData['created_by'] = req.tokenUser?.id;
                    categoriesData['modified_by'] = req.tokenUser?.id;
                    categoriesData['category_type'] = details?.category_type || 'Normal';
                    let saveData = await this.quizCategoriesService.save({ ...categoriesData });
                    let dynamicData = Object.create(null);
                    if (categoriesData['name']) {
                        let name = `quiz_category_name_${saveData['id']}`
                        dynamicData[`${name}`] = categoriesData['name'];
                    }
                    if (categoriesData['category_type']) {
                        let type = `quiz_category_type_${saveData['id']}`
                        dynamicData[`${type}`] = categoriesData['category_type'];
                    }
                    if (categoriesData['description']) {
                        let description = `quiz_category_description_${saveData['id']}`
                        dynamicData[`${description}`] = categoriesData['description'];
                    }
                    await this.translatorService.DynamicEngJsonData('Quizzes', saveData['id'], dynamicData, 'Add', 'Categories');
                    categoryId = saveData['id'];
                }
                let quizData = Object.create(null);
                quizOrder++;
                quizData['webinar_id'] = webinarId;
                quizData['cat_id'] = categoryId;
                quizData['quiz_name'] = details?.quiz_name ?? `${webinarDetails?.title}`;
                quizData['quiz_description'] = details?.quiz_description ?? `${webinarDetails?.description}`;
                quizData['question_per_page'] = details?.question_per_page ?? 1;
                quizData['num_of_questions'] = details?.num_of_questions ?? 0;
                quizData['quiz_order'] = quizOrder;
                quizData['is_webinar'] = 1;
                quizData['is_default'] = 1;
                quizData['quiz_type'] = 'Normal';
                quizData['status'] = 1;
                let saveQuiz = await this.quizQuizzesService.save(quizData);
                let quizId = saveQuiz?.['id'];
                let dynamicDataQuiz = Object.create(null);
                if (details?.quiz_name) {
                    let quizName = `quiz_name_${saveQuiz['id']}`
                    dynamicDataQuiz[`${quizName}`] = details?.quiz_name;
                }
                if (details?.quiz_description) {
                    let quizDescription = `quiz_description_${saveQuiz['id']}`
                    dynamicDataQuiz[`${quizDescription}`] = details?.quiz_description;
                }
                await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDataQuiz, 'Add', 'Quizzes');
                let questOrder = saveQuiz?.['quest_order'] || 0;
                for (let sectionDetails of details?.sections_list || []) {
                    let sectionData = {
                        name: sectionDetails?.section_name || '',
                        description: sectionDetails?.section_description || '',
                        quiz_id: quizId,
                        status: 1
                    }
                    let saveData = await this.quizSectionService.save({ ...sectionData });
                    let dynamicDatas = Object.create(null);
                    if (sectionDetails?.section_name) {
                        let tilte = `section_name_${saveData['id']}`
                        dynamicDatas[`${tilte}`] = sectionDetails?.section_name;
                    }
                    if (sectionDetails?.section_description) {
                        let tilte = `section_description_${saveData['id']}`
                        dynamicDatas[`${tilte}`] = sectionDetails?.section_description;
                    }
                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                }
                for (let quesDetails of details?.questions_list || []) {
                    questOrder++;
                    let quizDetailsData = Object.create(null);
                    quizDetailsData['quiz_id'] = saveQuiz['id'];
                    let TrueFalse = quesDetails?.TrueFalse || [];
                    let MultipleChoice = quesDetails?.MultipleChoice || [];
                    let MultipleResponse = quesDetails?.MultipleResponse || [];
                    let MatchingDropDown = quesDetails?.MatchingDropDown || [];
                    let Hotspot = quesDetails?.Hotspot || [];
                    let FillInTheBlanks = quesDetails?.FillInTheBlanks || [];
                    let MatchingDragDrop = quesDetails?.MatchingDragDrop || [];
                    let MultipleQuestion = quesDetails?.MultipleQuestion || [];
                    if ([TrueFalse, MultipleChoice, MultipleResponse, MatchingDropDown, Hotspot, FillInTheBlanks, MatchingDragDrop, MultipleQuestion].every(arr => arr.length === 0)) {
                        message = await this.translatorService.frontendReadTranslation(req.lang, 'Common_Value_Invalid');
                        continue;
                    }
                    quizDetailsData['quiz_type'] = quesDetails?.quiz_type ?? ''; // TrueFalse, MultipleChoice, MultipleResponse, MatchingDropDown, Hotspot, FillInTheBlanks, MatchingDragDrop, MultipleQuestion
                    quizDetailsData['ques_cat'] = quesDetails?.ques_cat ?? '';
                    quizDetailsData['ques_section'] = quesDetails?.ques_section ?? '';
                    quizDetailsData['quiz_question'] = quesDetails?.quiz_question ?? '';
                    quizDetailsData['answer_desc'] = quesDetails?.answer_desc ?? '';
                    quizDetailsData['quest_time'] = quesDetails?.quest_time ?? '';
                    quizDetailsData['question_type'] = quesDetails?.question_type ?? '';
                    quizDetailsData['question_info'] = quesDetails?.question_info ?? '';
                    quizDetailsData['quest_order'] = questOrder;
                    quizDetailsData['quest_set_time'] = quesDetails?.quest_set_time ?? '';
                    quizDetailsData['status'] = 1;
                    let saveQuizDetails = await this.quizDetailsService.save(quizDetailsData);
                    let dynamicDatas = Object.create(null);
                    if (quesDetails?.quiz_question) {
                        let tilte = `question_name_${saveQuizDetails['id']}`
                        dynamicDatas[`${tilte}`] = quesDetails?.quiz_question;
                    }
                    if (quesDetails?.answer_desc) {
                        let tilte = `question_answer_${saveQuizDetails['id']}`
                        dynamicDatas[`${tilte}`] = quesDetails?.answer_desc;
                    }
                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', saveQuizDetails['id']);
                    if (saveQuizDetails && saveQuizDetails['id']) {
                        switch (quesDetails?.quiz_type) {
                            case 'TrueFalse':
                                if (TrueFalse.length > 0) {
                                    await this.quizTrueFalseQuestionsService.save({ question_id: saveQuizDetails['id'], ...TrueFalse[0] });
                                }
                                break;
                            case 'MultipleChoice':
                                if (MultipleChoice.length > 0) {
                                    let choiceData = await this.quizMultipleChoiceQuestionService.save({ question_id: saveQuizDetails['id'], ...MultipleChoice[0] });
                                    let dynamicDatas = Object.create(null);
                                    for (let i = 1; i <= 6; i++) {
                                        if (MultipleChoice[0][`opt_${i}`]) {
                                            let optVal = `multiplechoice_option_${MultipleChoice[0].question_id}opt${i}_${choiceData['id']}`
                                            dynamicDatas[`${optVal}`] = MultipleChoice[0][`opt_${i}`];
                                        }
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Edit', 'Quizzes', quizId);
                                }
                                break;
                            case 'MultipleResponse':
                                if (MultipleResponse.length > 0) {
                                    let dynamicDatas = Object.create(null);
                                    let multipleResponseData = await this.quizMultipleResponseQuestionService.save({ question_id: saveQuizDetails['id'], ...MultipleResponse[0] });
                                    for (let i = 1; i <= 6; i++) {
                                        if (multipleResponseData[`choice_${i}`]) {
                                            let optVal = `multiplechoice_option_${saveQuizDetails['id']}_choice${i}_${multipleResponseData['id']}`
                                            dynamicDatas[`${optVal}`] = multipleResponseData[`choice_${i}`];
                                        }
                                        if (multipleResponseData[`choice_${i}`]) {
                                            let optVal = `multipleresponse_option_${saveQuizDetails['id']}_choice${i}_${multipleResponseData['id']}`
                                            dynamicDatas[`${optVal}`] = multipleResponseData[`choice_${i}`];
                                        }
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                                }
                                break;
                            case 'MatchingDropDown':
                                if (MatchingDropDown.length > 0) {
                                    let dynamicDatas = Object.create(null);
                                    for (var i = 0; i < MatchingDropDown.length; i++) {
                                        let questionId = await this.quizMatchingDropDownQuestionService.save({ question_id: saveQuizDetails['id'], ...MatchingDropDown[i] });
                                        let optVal = `matchingdropdown_option_${saveQuizDetails['id']}_${questionId['id']}`
                                        dynamicDatas[`${optVal}`] = MatchingDropDown[i]['drop_options'];
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                                }
                                break;
                            case 'Hotspot':
                                if (file && Object.keys(file).length > 0 && Hotspot.length > 0) {
                                    for (let fileData of file) {
                                        if (fileData && fileData?.fieldname?.startsWith('json_file')) {
                                            continue;
                                        }
                                        if (fileData && fileData?.fieldname?.startsWith('hotspot_image')) {
                                            let key: string = fileData.fieldname;
                                            fileData.originalname = this.commonFileService.formatFileName(fileData.originalname);
                                            fileData.fieldname = `quiz/${quizId.toString()}/${saveQuizDetails['id'].toString()}/${key}_${this.commonService.generateMD5(saveQuizDetails['id'].toString())}.${fileData.originalname.split('.')[fileData.originalname.split('.').length - 1]}`;
                                            await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(fileData.path), filename: fileData.fieldname }));
                                            Hotspot[0][key] = fileData.fieldname;
                                        }
                                    }
                                    await this.quizHotspotQuestionService.save({ question_id: saveQuizDetails['id'], ...Hotspot[0] });
                                }
                                break;
                            case 'FillInTheBlanks':
                                if (FillInTheBlanks.length > 0) {
                                    let dynamicDatas = Object.create(null);
                                    for (var i = 0; i < FillInTheBlanks.length; i++) {
                                        let questionId = await this.quizFillUpQuestionService.save({ question_id: saveQuizDetails['id'], ...FillInTheBlanks[i] });
                                        dynamicDatas[`fillup_option_${saveQuizDetails['id']}_${questionId['id']}`] = FillInTheBlanks[i]['blank_options'];
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                                }
                                break;
                            case 'MatchingDragDrop':
                                if (MatchingDragDrop.length > 0) {
                                    let dynamicDatas = Object.create(null);
                                    for (var i = 0; i < MatchingDragDrop.length; i++) {
                                        let questionId = await this.quizMatchingDragDropQuestionService.save({ question_id: saveQuizDetails['id'], ...MatchingDragDrop[i] });
                                        dynamicDatas[`dragdrop_question_${saveQuizDetails['id']}_${questionId['id']}`] = MatchingDragDrop[i]['question'];
                                        dynamicDatas[`dragdrop_answer_${saveQuizDetails['id']}_${questionId['id']}`] = MatchingDragDrop[i]['answer'][i];
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                                }
                                break;
                            case 'MultipleQuestion':
                                if (MultipleQuestion.length > 0) {
                                    let dynamicDatas = Object.create(null);
                                    for (var i = 0; i < MultipleQuestion.length; i++) {
                                        let questionId = await this.quizMultipleQuestionService.save({ question_id: saveQuizDetails['id'], ...MultipleQuestion[i] });
                                        let optVal = `multiple_question_${saveQuizDetails['id']}_${questionId['id']}`
                                        dynamicDatas[`${optVal}`] = MultipleQuestion[i]['question'];
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                                }
                                break;
                        }
                    }
                }
            }
            if (message && message != '') {
                for (let fileData of file) {
                    await this.commonFileService.removeFileFromLocal(`${fileData.path}`);
                }
                throw new Error(message);
            }
            // remove file from local after reading
            await Promise.all(
                file.map(f =>
                    this.commonFileService.removeFileFromLocal(f.path)
                        .catch(() => { }) // ignore errors
                )
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
            });
        }
        catch (error) {
            for (let fileData of Object.keys(file)) {
                await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
            }
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
    @UseGuards(AccessGuard)
    @Post('copy-quiz')
    async copyQuiz(@Req() req: Request, @Res() res: Response, @Body() postData: CopyQuizInput) {
        try {
            if (!this.commonService.isValidNumber(postData?.quiz_id) || !this.commonService.isValidNumber(postData?.webinar_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let message = '';
            let checkQuiz: any = await this.quizQuizzesService.listRecord(['qz'], `qz.webinar_id = ${postData?.webinar_id} AND qz.status != 2`, { id: 'DESC' });
            let quizOrder = 0;
            quizOrder = checkQuiz && checkQuiz.length > 0 ? checkQuiz[0]['quiz_order'] : 0;
            let quizResult: any = checkQuiz?.find((quiz) => quiz?.id == postData?.quiz_id);
            if (!quizResult) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            let quizData = Object.create(null);
            quizOrder++;
            // Generate unique quiz name and description
            if (quizResult?.quiz_name) {
                const baseName = quizResult.quiz_name.trim();
                const similarQuizzes = await this.quizQuizzesService.listRecord(
                    ['qz'],
                    `qz.quiz_name LIKE '${baseName}%' AND qz.status != 2`,
                    { id: 'DESC' }
                );
                if (similarQuizzes && similarQuizzes.length > 0) {
                    const existingNames = similarQuizzes.map(q => q.quiz_name);
                    const escapedBase = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pattern = new RegExp(`^${escapedBase} (?:[Cc]opy)(?: (\\d+))?$`);
                    let maxNumber = 0;
                    let hasPlainCopy = false;
                    existingNames.forEach(name => {
                        const match = name.match(pattern);
                        if (match) {
                            if (match[1]) {
                                const num = parseInt(match[1], 10);
                                if (num > maxNumber) maxNumber = num;
                            } else {
                                hasPlainCopy = true;
                            }
                        }
                    });
                    if (hasPlainCopy) {
                        maxNumber = Math.max(maxNumber, 1);
                    }
                    const nextNumber = maxNumber + 1;
                    const suffix = nextNumber === 1 ? ' Copy' : ` Copy ${nextNumber}`;
                    quizResult.quiz_name = `${baseName}${suffix}`;
                    quizResult.quiz_description = `${quizResult?.quiz_description}${suffix}`;
                }
            }
            quizData['webinar_id'] = quizResult?.webinar_id;
            quizData['cat_id'] = quizResult?.cat_id;
            quizData['quiz_name'] = `${quizResult?.quiz_name}`;
            quizData['quiz_description'] = `${quizResult?.quiz_description}`;
            quizData['question_per_page'] = quizResult?.question_per_page ?? 1;
            quizData['num_of_questions'] = quizResult?.num_of_questions ?? 0;
            quizData['quiz_order'] = quizOrder;
            quizData['is_webinar'] = 1;
            quizData['is_default'] = 0;
            quizData['quiz_type'] = 'Normal';
            quizData['status'] = 1;
            let saveQuiz = await this.quizQuizzesService.save(quizData);
            let quizId = saveQuiz?.['id'];
            let dynamicDataQuiz = Object.create(null);
            if (quizData?.quiz_name) {
                let quizName = `quiz_name_${saveQuiz['id']}`
                dynamicDataQuiz[`${quizName}`] = quizData?.quiz_name;
            }
            if (quizData?.quiz_description) {
                let quizDescription = `quiz_description_${saveQuiz['id']}`
                dynamicDataQuiz[`${quizDescription}`] = quizData?.quiz_description;
            }
            await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDataQuiz, 'Add', 'Quizzes');
            let questOrder = saveQuiz?.['quest_order'] || 0;
            let sectionsList = await this.quizSectionService.listRecord({ quiz_id: postData?.quiz_id, status: Not(2) }, { id: 'ASC' });
            for (let sectionDetails of sectionsList || []) {
                let sectionData = {
                    name: sectionDetails?.['section_name'] || '',
                    description: sectionDetails?.['section_description'] || '',
                    quiz_id: quizId,
                    status: 1
                }
                let saveData = await this.quizSectionService.save({ ...sectionData });
                let dynamicDatas = Object.create(null);
                if (sectionDetails?.['section_name']) {
                    let tilte = `section_name_${saveData['id']}`
                    dynamicDatas[`${tilte}`] = sectionDetails?.['section_name'];
                }
                if (sectionDetails?.['section_description']) {
                    let tilte = `section_description_${saveData['id']}`
                    dynamicDatas[`${tilte}`] = sectionDetails?.['section_description'];
                }
                await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
            }
            let fields = [
                'qz.id',
                'qd.id', 'qd.quiz_id', 'qd.quiz_type', 'qd.ques_cat', 'qd.ques_section', 'qd.quiz_question', 'qd.answer_desc', 'qd.quest_time',
                'qd.question_type', 'qd.question_info', 'qd.quest_order', 'qd.quest_set_time', 'qd.status',
                'tf.id', 'tf.question_id', 'tf.quest_answer', 'tf.status',
                'mc.id', 'mc.question_id', 'mc.opt_1', 'mc.opt_2', 'mc.opt_3', 'mc.opt_4', 'mc.opt_5', 'mc.opt_6', 'mc.num_opts', 'mc.quest_answer', 'mc.status',
                'mr.id', 'mr.question_id', 'mr.choice_1', 'mr.choice_2', 'mr.choice_3', 'mr.choice_4', 'mr.choice_5', 'mr.choice_6', 'mr.answers', 'mr.num_choices', 'mr.status',
                'mdd.id', 'mdd.question_id', 'mdd.drop_options', 'mdd.num_drop_opts', 'mdd.right_answer', 'mdd.status',
                'hp.id', 'hp.question_id', 'hp.image1', 'hp.image2', 'hp.image3', 'hp.image4', 'hp.image5', 'hp.image6', 'hp.image7', 'hp.image8', 'hp.image9', 'hp.numopts',
                'hp.correct_block', 'hp.status',
                'fib.id', 'fib.question_id', 'fib.blank_options', 'fib.correct_blank', 'fib.status',
                'qdd.id', 'qdd.question_id', 'qdd.question', 'qdd.answer', 'qdd.status',
                'mq.id', 'mq.question_id', 'mq.question', 'mq.answer', 'mq.status'
            ]
            let quizDetails = await this.quizQuizzesService.findOneQuizAllRecord(
                fields,
                `qz.id = ${postData?.quiz_id} AND qz.status = 1`,
                null,
                [
                    tableConstant.QUIZ.TBL_QZ_TF_QUESTIONS,
                    tableConstant.QUIZ.TBL_QZ_MULTIPLE_CHOICE_QUESTIONS,
                    tableConstant.QUIZ.TBL_QZ_MULTIPLE_RESPONSE_QUESTIONS,
                    tableConstant.QUIZ.TBL_QZ_MATCHING_DROPDOWN_QUESTIONS,
                    tableConstant.QUIZ.TBL_QZ_HOTSPOT_QUESTIONS,
                    tableConstant.QUIZ.TBL_QZ_FILLUP_QUESTIONS,
                    tableConstant.QUIZ.TBL_QZ_MATCHING_DRAGDROP_QUESTIONS,
                    tableConstant.QUIZ.TBL_QZ_MULTIPLE_QUESTIONS
                ],
            );
            if (quizDetails && quizDetails?.qd && quizDetails?.qd.length > 0) {
                await Promise.all(quizDetails?.qd?.map(async (quesDetails) => {
                    if (!quesDetails || quesDetails == null) {
                        return;
                    }
                    if (!quesDetails['TrueFalse']) {
                        quesDetails['TrueFalse'] = [];
                    }
                    quesDetails['TrueFalse'] = quesDetails?.tf && quesDetails?.tf.question_id == quesDetails.id ? [quesDetails?.tf] : [];
                    if (!quesDetails['MultipleChoice']) {
                        quesDetails['MultipleChoice'] = [];
                    }
                    quesDetails['MultipleChoice'] = quesDetails?.mc && quesDetails?.mc.question_id == quesDetails.id ? [quesDetails?.mc] : [];
                    if (!quesDetails['MultipleResponse']) {
                        quesDetails['MultipleResponse'] = [];
                    }
                    quesDetails['MultipleResponse'] = quesDetails?.mr && quesDetails?.mr.question_id == quesDetails.id ? [quesDetails?.mr] : [];
                    if (!quesDetails['MatchingDropDown']) {
                        quesDetails['MatchingDropDown'] = [];
                    }
                    quesDetails['MatchingDropDown'] = quesDetails?.mdd?.filter((mdd) => mdd.question_id == quesDetails.id);
                    if (!quesDetails['Hotspot']) {
                        quesDetails['Hotspot'] = [];
                    }
                    quesDetails['Hotspot'] = quesDetails?.hp && quesDetails?.hp.question_id == quesDetails.id ? [quesDetails?.hp] : [];
                    if (!quesDetails['FillInTheBlanks']) {
                        quesDetails['FillInTheBlanks'] = [];
                    }
                    quesDetails['FillInTheBlanks'] = quesDetails?.fib?.filter((fib) => fib.question_id == quesDetails.id);
                    if (!quesDetails['MatchingDragDrop']) {
                        quesDetails['MatchingDragDrop'] = [];
                    }
                    quesDetails['MatchingDragDrop'] = quesDetails?.qdd?.filter((qdd) => qdd.question_id == quesDetails.id);
                    if (!quesDetails['MultipleQuestion']) {
                        quesDetails['MultipleQuestion'] = [];
                    }
                    quesDetails['MultipleQuestion'] = quesDetails?.mq?.filter((mq) => mq.question_id == quesDetails.id);
                    return quesDetails;
                }));
                for (let quesDetails of quizDetails?.qd || []) {
                    questOrder++;
                    let quizDetailsData = Object.create(null);
                    quizDetailsData['quiz_id'] = saveQuiz['id'];
                    let TrueFalse = quesDetails?.TrueFalse || [];
                    let MultipleChoice = quesDetails?.MultipleChoice || [];
                    let MultipleResponse = quesDetails?.MultipleResponse || [];
                    let MatchingDropDown = quesDetails?.MatchingDropDown || [];
                    let Hotspot = quesDetails?.Hotspot || [];
                    let FillInTheBlanks = quesDetails?.FillInTheBlanks || [];
                    let MatchingDragDrop = quesDetails?.MatchingDragDrop || [];
                    let MultipleQuestion = quesDetails?.MultipleQuestion || [];
                    if ([TrueFalse, MultipleChoice, MultipleResponse, MatchingDropDown, Hotspot, FillInTheBlanks, MatchingDragDrop, MultipleQuestion].every(arr => arr.length === 0)) {
                        // message = await this.translatorService.frontendReadTranslation(req.lang, 'Common_Value_Invalid');
                        continue;
                    }
                    quizDetailsData['quiz_type'] = quesDetails?.quiz_type ?? ''; // TrueFalse, MultipleChoice, MultipleResponse, MatchingDropDown, Hotspot, FillInTheBlanks, MatchingDragDrop, MultipleQuestion
                    quizDetailsData['ques_cat'] = quesDetails?.ques_cat ?? '';
                    quizDetailsData['ques_section'] = quesDetails?.ques_section ?? '';
                    quizDetailsData['quiz_question'] = quesDetails?.quiz_question ?? '';
                    quizDetailsData['answer_desc'] = quesDetails?.answer_desc ?? '';
                    quizDetailsData['quest_time'] = quesDetails?.quest_time ?? '';
                    quizDetailsData['question_type'] = quesDetails?.question_type ?? '';
                    quizDetailsData['question_info'] = quesDetails?.question_info ?? '';
                    quizDetailsData['quest_order'] = questOrder;
                    quizDetailsData['quest_set_time'] = quesDetails?.quest_set_time ?? '';
                    quizDetailsData['status'] = quesDetails?.status ?? 1;
                    let saveQuizDetails = await this.quizDetailsService.save(quizDetailsData);
                    let dynamicDatas = Object.create(null);
                    if (quesDetails?.quiz_question) {
                        let tilte = `question_name_${saveQuizDetails['id']}`
                        dynamicDatas[`${tilte}`] = quesDetails?.quiz_question;
                    }
                    if (quesDetails?.answer_desc) {
                        let tilte = `question_answer_${saveQuizDetails['id']}`
                        dynamicDatas[`${tilte}`] = quesDetails?.answer_desc;
                    }
                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', saveQuizDetails['id']);
                    if (saveQuizDetails && saveQuizDetails['id']) {
                        switch (quesDetails?.quiz_type) {
                            case 'TrueFalse':
                                if (TrueFalse.length > 0) {
                                    delete TrueFalse?.[0]?.['id'];
                                    await this.quizTrueFalseQuestionsService.save({ question_id: saveQuizDetails['id'], ...TrueFalse[0] });
                                }
                                break;
                            case 'MultipleChoice':
                                if (MultipleChoice.length > 0) {
                                    delete MultipleChoice?.[0]?.['id'];
                                    let choiceData = await this.quizMultipleChoiceQuestionService.save({ question_id: saveQuizDetails['id'], ...MultipleChoice[0] });
                                    let dynamicDatas = Object.create(null);
                                    for (let i = 1; i <= 6; i++) {
                                        if (MultipleChoice[0][`opt_${i}`]) {
                                            let optVal = `multiplechoice_option_${MultipleChoice[0].question_id}opt${i}_${choiceData['id']}`
                                            dynamicDatas[`${optVal}`] = MultipleChoice[0][`opt_${i}`];
                                        }
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Edit', 'Quizzes', quizId);
                                }
                                break;
                            case 'MultipleResponse':
                                if (MultipleResponse.length > 0) {
                                    let dynamicDatas = Object.create(null);
                                    delete MultipleResponse?.[0]?.['id'];
                                    let multipleResponseData = await this.quizMultipleResponseQuestionService.save({ question_id: saveQuizDetails['id'], ...MultipleResponse[0] });
                                    for (let i = 1; i <= 6; i++) {
                                        if (multipleResponseData[`choice_${i}`]) {
                                            let optVal = `multiplechoice_option_${saveQuizDetails['id']}_choice${i}_${multipleResponseData['id']}`
                                            dynamicDatas[`${optVal}`] = multipleResponseData[`choice_${i}`];
                                        }
                                        if (multipleResponseData[`choice_${i}`]) {
                                            let optVal = `multipleresponse_option_${saveQuizDetails['id']}_choice${i}_${multipleResponseData['id']}`
                                            dynamicDatas[`${optVal}`] = multipleResponseData[`choice_${i}`];
                                        }
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                                }
                                break;
                            case 'MatchingDropDown':
                                if (MatchingDropDown.length > 0) {
                                    let dynamicDatas = Object.create(null);
                                    for (var i = 0; i < MatchingDropDown.length; i++) {
                                        delete MatchingDropDown?.[i]?.['id'];
                                        let questionId = await this.quizMatchingDropDownQuestionService.save({ question_id: saveQuizDetails['id'], ...MatchingDropDown[i] });
                                        let optVal = `matchingdropdown_option_${saveQuizDetails['id']}_${questionId['id']}`
                                        dynamicDatas[`${optVal}`] = MatchingDropDown[i]['drop_options'];
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                                }
                                break;
                            case 'Hotspot':
                                if (Hotspot.length > 0) {
                                    delete Hotspot[0]['id'];
                                    await this.quizHotspotQuestionService.save({ question_id: saveQuizDetails['id'], ...Hotspot[0] });
                                }
                                break;
                            case 'FillInTheBlanks':
                                if (FillInTheBlanks.length > 0) {
                                    let dynamicDatas = Object.create(null);
                                    for (var i = 0; i < FillInTheBlanks.length; i++) {
                                        delete FillInTheBlanks?.[i]?.['id'];
                                        let questionId = await this.quizFillUpQuestionService.save({ question_id: saveQuizDetails['id'], ...FillInTheBlanks[i] });
                                        dynamicDatas[`fillup_option_${saveQuizDetails['id']}_${questionId['id']}`] = FillInTheBlanks[i]['blank_options'];
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                                }
                                break;
                            case 'MatchingDragDrop':
                                if (MatchingDragDrop.length > 0) {
                                    let dynamicDatas = Object.create(null);
                                    for (var i = 0; i < MatchingDragDrop.length; i++) {
                                        delete MatchingDragDrop?.[i]?.['id'];
                                        let questionId = await this.quizMatchingDragDropQuestionService.save({ question_id: saveQuizDetails['id'], ...MatchingDragDrop[i] });
                                        dynamicDatas[`dragdrop_question_${saveQuizDetails['id']}_${questionId['id']}`] = MatchingDragDrop[i]['question'];
                                        dynamicDatas[`dragdrop_answer_${saveQuizDetails['id']}_${questionId['id']}`] = MatchingDragDrop[i]['answer'][i];
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                                }
                                break;
                            case 'MultipleQuestion':
                                if (MultipleQuestion.length > 0) {
                                    let dynamicDatas = Object.create(null);
                                    for (var i = 0; i < MultipleQuestion.length; i++) {
                                        delete MultipleQuestion?.[i]?.['id'];
                                        let questionId = await this.quizMultipleQuestionService.save({ question_id: saveQuizDetails['id'], ...MultipleQuestion[i] });
                                        let optVal = `multiple_question_${saveQuizDetails['id']}_${questionId['id']}`
                                        dynamicDatas[`${optVal}`] = MultipleQuestion[i]['question'];
                                    }
                                    await this.translatorService.DynamicEngJsonData('Quizzes', '0', dynamicDatas, 'Add', 'Quizzes', quizId);
                                }
                                break;
                            default: 
                                break;
                        }
                    }
                }
            }
            if (message && message != '') {
                throw new Error(message);
            }
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
}