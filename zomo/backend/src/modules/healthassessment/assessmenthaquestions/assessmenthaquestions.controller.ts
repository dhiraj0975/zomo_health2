import {
    appConstant,
    AssessmentHaOptionsEntity,
    AssessmentHaQuestionsDto,
    CommonArrayService,
    CommonDateService,
    CommonService,
    tableConstant,
    UserEntity
} from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { Between, In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import {
    CreateAssessmentHaQuestionsInput,
    PaginateWithHealthAssessmentInput
} from "../../../input";
import { CompanyService } from "../../company/companies/company.service";
import { TranslationService } from "../../translation/translation.service";
import { UserService } from "../../user/user/user.service";
import { AssessmentHaOptionsService } from "../assessmenthaoptions/assessmenthaoptions.service";
import { AssessmentsService } from "../assessments/assessments.service";
import { FrontService } from "../front/front.service";
import { AssessmentHaQuestionsService } from "./assessmenthaquestions.service";
@Controller('health-assessment/questions')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentHaQuestionsController {
    constructor(
        private readonly assessmentQuestionsService: AssessmentHaQuestionsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly assessmentOptionsService: AssessmentHaOptionsService,
        private readonly userService: UserService,
        private readonly assessmentsService: AssessmentsService,
        private readonly activityLogService: ActivityLogService,
        private readonly companyService: CompanyService,
        private readonly frontService: FrontService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData.page = postData?.page || 1
            postData.limit = postData?.limit || 10
            postData = this.commonService.sanitizePayload(postData);
            let where = `healthassessment.id != 0 AND healthassessment.status != '2' AND healthassessment.main_question_id = 0 `;
            if(postData?.questioncat_id){
                where += `AND healthassessment.questioncat_id = ${postData?.questioncat_id} `;
            }
            if (postData?.search_str) {
                where += `AND(healthassessment.title LIKE '%${postData?.search_str}%' OR healthassessment.question_title LIKE '%${postData?.search_str}%' OR healthassessment.company_id LIKE '%${postData?.search_str}%' OR healthassessment.general LIKE '%${postData?.search_str}%' OR healthassessment.question_code LIKE '%${postData?.search_str}%' OR healthassessment.chart_group LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.assessmentQuestionsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentHaQuestionsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.question_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`question_title_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/hra/${ele?.questioncat_id}`,`dynamic`);
                        ele.question_title = (customName == '' || customName == `question_title_${ele['id']}`) ? ele['question_title'] : customName;
                    }
                }));
            }
            let srNoStart = ((postData?.page - 1) * postData?.limit) + 1;
            for(let i = 0; i < resultedData['list'].length; i++) {
                resultedData['list'][i] = {
                    ...resultedData['list'][i],
                    sr_no: srNoStart + i
                };
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            if(postData?.company_id){
                where['company_id'] = postData?.company_id;
            }
            let resultedData = await this.assessmentQuestionsService.findOne(where);
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
                await this.commonArrayService.formatToDto(AssessmentHaQuestionsDto, resultedData, req.lang)
            );
            if(resultedData.question_title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`question_title_${resultedData['id']}`, `/LC_MESSAGES/MyHealth/Assessment/hra/${resultedData?.questioncat_id}`,`dynamic`);
                resultedData.question_title = (customName == '' || customName == `question_title_${resultedData['id']}`) ? resultedData['question_title'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentHaQuestionsInput) {
        try {
            postData['language_id'] = postData?.language_id ?? 1;
            postData['main_question_id'] = postData?.main_question_id ?? 0;
            postData['title'] = postData?.title ?? '';
            postData['order'] = postData?.order ?? 1;
            postData['mchart_group_wt'] = postData?.mchart_group_wt ?? 0;
            postData['fchart_group_wt'] = postData?.fchart_group_wt ?? 0;
            postData['general'] = postData?.general ?? '';
            postData['age_limit'] = postData?.age_limit ?? 0;
            postData['age_condition'] = postData?.age_condition ?? 0;
            postData['na'] = postData?.na ?? 0;
            if (
                !postData?.questioncat_id ||
                !postData?.question_title ||
                (postData?.type == undefined || postData?.type == null) ||
                (postData?.show == undefined || postData?.show == null) ||
                (postData?.company_id == undefined || postData?.company_id == null) ||
                (postData?.age_considered == undefined || postData?.age_considered == null) 
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const assessmentQuestionsOrder = await this.frontService.assessmentHaQuestionsFindOne(['order'],{ questioncat_id: postData?.questioncat_id, status: Not(2) },{order:'DESC'});
            /*TODO: order to order_id db field change*/
            postData['order'] = assessmentQuestionsOrder && assessmentQuestionsOrder['order'] ? assessmentQuestionsOrder['order'] + 1 : 1;
            let questionData = await this.assessmentQuestionsService.save({...postData});
            let dynamicDatas = Object.create(null);
            if(postData?.question_title){
                let tilte = `question_title_${questionData.identifiers[0].id}`
                dynamicDatas[`${tilte}`] = postData?.question_title;
            }                        
            await this.translatorService.DynamicEngJsonData('MyHealth','hra',dynamicDatas,'Edit','Assessment',postData?.questioncat_id);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentQuestionsService.findOne(where);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.assessmentQuestionsService.update(where,{status:2});
            await this.activityLogService.create(recordDetails, {title: recordDetails}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_QUESTIONS, req.tokenUser?.id, 'delete')
            const options: AssessmentHaOptionsEntity[] = await this.assessmentOptionsService.listRecord({question_id: postData?.id});
            await this.assessmentOptionsService.update({question_id: postData?.id},{status:2});
            options?.map((ele)=>this.activityLogService.create(ele, {option_titile: recordDetails}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_OPTIONS, req.tokenUser?.id, 'delete'));
            if (recordDetails.questioncat_id) {
                const questionKey: string = `question_title_${recordDetails.id}`;
                const dynamicData: Record<string, string> = {
                    [questionKey]: questionKey,
                };
                for (let i: number = 0; i < options.length; i++) {
                    const o:AssessmentHaOptionsEntity = options[i];
                    let optionKey: string = `option_title_${o.question_id}_${o.id}`;
                    dynamicData[optionKey] = optionKey;
                }
                await this.translatorService.DynamicEngJsonData('MyHealth','hra',dynamicData,'Delete','Assessment',recordDetails.questioncat_id);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentHaQuestionsInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (postData?.company_id == '0') {
                let companiesData = await this.companyService.companyListRecord(['id'],{status:1,deleted:0});
                if (companiesData) {
                    let ids = companiesData.map(company => company.id);
                    postData.company_id = ids.join(",");
                }
            }
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentQuestionsService.findOne(where);
            if (!recordDetails) {
                await this.assessmentQuestionsService.save({
                    ...postData,
                });
            }
            await this.assessmentQuestionsService.update(where, {...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_QUESTIONS, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.question_title){
                let tilte = `question_title_${postData['id']}`
                dynamicDatas[`${tilte}`] = postData?.question_title;
            }                        
            await this.translatorService.DynamicEngJsonData('MyHealth','hra',dynamicDatas,'Edit','Assessment',recordDetails?.questioncat_id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let data = {}
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            let fields: (keyof UserEntity)[] = ['dob'];
            postData.questioncat_id = Number(postData?.questioncat_id);
            if (req.tokenUser?.role_id === appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) {
                fields = [
                    ...fields,
                    'id',
                    'first_name',
                    'middle_name',
                    'last_name',
                    'username'
                ] as (keyof UserEntity)[];
            }
            let userData = await this.userService.findUserRecord({id: postData?.user_id},fields);
            if (!userData.dob) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_DOB_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            data['user'] = userData;
            let where = `option.id IS NOT NULL AND healthassessment.status != '2'`;
            if ((req.tokenUser?.role_id === appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) && !postData?.user_id) {
                where += `AND healthassessment.type = '0' OR healthassessment.type = '1' OR (healthassessment.type = '3' AND healthassessment.na = '1') `;
            }
            if (![1,2,3,4,5].includes(Number(postData?.questioncat_id))) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            let orderBy = null;
            if(postData?.questioncat_id){
                where += `AND healthassessment.questioncat_id = ${postData?.questioncat_id} `;
                orderBy = {order: 'ASC'};
            }
            if(postData?.language_id){
                where += `AND healthassessment.language_id = ${postData?.language_id} `;
            }
            if(postData?.parent_question){
                where += `AND healthassessment.id != ${postData?.parent_question} `;
            }
            if(postData?.org_id){
                where += `AND FIND_IN_SET(${postData?.org_id},healthassessment.company_id) `;
                orderBy = {order: 'ASC'};
            }
            if(postData?.parent){
                where += `AND healthassessment.parent_id Is Null `;
            }
            if (postData?.show) {
                where += `AND healthassessment.show IN(${postData?.show}) `;
            }
            let assWhere = {user_id: postData?.user_id,hra_reset: 0, status: Not(2)}
            if (postData?.date) {
                postData.date = await this.commonDateService.DateTimeFormat(new Date(postData?.date), 'YYYY-MM-DD')
                assWhere = {...assWhere,...{date: Between(`${postData?.date} 00:00:00`, `${postData?.date} 23:59:59`)}}
            }
            let assessmentsAnswer: any = await this.assessmentsService.findOne(assWhere,[`${postData?.questioncat_id}`,'hra_status','date'],{date: 'DESC'});
            let currentData = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD');
            let created = await this.commonDateService.DateTimeFormat(assessmentsAnswer?.date,'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss');
            if (assessmentsAnswer?.hra_status >= 100) {
                if (currentData != created) {
                    assessmentsAnswer = null;
                }
            }
            let resultedData: any = await this.assessmentQuestionsService.listRecord(where, orderBy, ['healthassessment.id','healthassessment.questioncat_id','healthassessment.type','healthassessment.question_title','healthassessment.parent_id','healthassessment.parent_option_id','healthassessment.main_question_id','healthassessment.required','healthassessment.age_limit','healthassessment.age_condition','healthassessment.age_considered','option']);
            let parentOption = [],parentArray = [];
            resultedData.forEach((obj, index) => {
                if (obj.parent_option_id) {
                    parentOption[obj.parent_option_id] = {id: obj.id,parent_id: obj.parent_id,parent_option_id: obj.parent_option_id};
                    parentArray.push(obj.parent_id)
                }
                obj['answer'] = (assessmentsAnswer && assessmentsAnswer?.[`${postData?.questioncat_id}`]) ? assessmentsAnswer[`${postData?.questioncat_id}`].split(',') : [];
            });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentHaQuestionsDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    let questioncatId = ele?.questioncat_id
                    let questionId = ele?.id
                    if(ele?.question_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`question_title_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/hra/${ele?.questioncat_id}`,`dynamic`);
                        ele.question_title = (customName == '' || customName == `question_title_${ele['id']}`) ? ele['question_title'] : customName;
                    }
                    if (ele?.option?.length) {
                        await Promise.all(ele?.option.map(async (ele)=>{
                            if(ele?.option_title){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`option_title_${questionId}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/hra/${questioncatId}`,`dynamic`);
                                ele.option_title = (customName == '' || customName == `option_title_${questionId}_${ele['id']}`) ? ele['option_title'] : customName;
                            }
                            if (ele?.optionMenu?.length) {
                                await Promise.all(ele?.optionMenu.map(async (ele)=>{
                                    if(ele?.option_title){
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`option_title_${questionId}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/hra/${questioncatId}`,`dynamic`);
                                        ele.option_title = (customName == '' || customName == `option_title_${questionId}_${ele['id']}`) ? ele['option_title'] : customName;
                                    }
                                }));
                            }
                        }));
                    }
                }));
            }
            for(let i = 0; i < resultedData.length; i++) {
                if (resultedData[i].age_considered == 1) {
                    let currentYear = new Date().getFullYear();
                    let userYear = new Date(userData.dob).getFullYear();
                    let urDOB = currentYear - userYear;
                    const AgeLimits = {
                        1: (dob, limit) => dob > limit,
                        2: (dob, limit) => dob >= limit,
                        3: (dob, limit) => dob < limit,
                        4: (dob, limit) => dob <= limit,
                        5: (dob, limit) => dob == limit
                    };
                    let ageResult = AgeLimits[resultedData[i].age_condition](urDOB, resultedData[i].age_limit);
                    if (!ageResult) {
                        resultedData.splice(i, 1);
                        continue;
                    }
                }
                if (parentArray.includes(resultedData[i].id)) {
                    for(let j = 0; j < resultedData[i].option.length; j++) {
                        if (parentOption[resultedData[i].option[j].id]) {
                            resultedData[i].option[j].children_question_id = parentOption[resultedData[i].option[j].id].id
                        }
                    }
                }
            }
            data['list'] = resultedData
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: 'success',
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
    @Post('change-order')
    async changeOrder(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (postData?.order.length == 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const resultedData: any = await this.frontService.assessmentHaQuestionsListRecord({ id: In(postData?.order)},['order'],{order:'ASC'});
            const orderArray = postData?.order;
            let answers = resultedData.map(obj => obj.order);
            for (let i = 0; i < orderArray.length; i++) {
                await this.assessmentQuestionsService.update({id: orderArray[i]},{order:answers[i]});
            }
            await this.activityLogService.create(resultedData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_QUESTIONS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_ORDER_CHANGE"),
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
}