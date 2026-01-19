import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, MyPlanBusinessRuleDto, tableConstant, WellBeingPostDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Not, Raw } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    ActivitygetInput,
    CreateBusinessRuleInput,
    DeleteMyPlanInput,
    GetOneMyPlanInput, ListMyPlanInput, PaginateWithCompanyInput,
    UpdateBusinessRuleInput,
} from "../../../input";
import { ActivityService } from "../../activity/activity/activity.service";
import { ScheduleChallengeService } from '../../challenge/schedulechallenge/schedulechallenge.service';
import { CompanyService } from "../../company/companies/company.service";
import { WellBeingPostService } from "../../emotionalwellbeing/wellbeingpost/wellbeingpost.service";
import { EventCategoryService } from "../../events/eventcategory/eventcategory.service";
import { EventService } from "../../events/events/events.service";
import { EventGlobalEventsService } from "../../events/globalevents/globalevents.service";
import { AssessmentResultsService } from "../../healthassessment/assessmentresults/assessmentresults.service";
import { QuickLinkService } from '../../quicklink/quicklink/quicklink.service';
import { QuizQuizzesService } from "../../quiz/quizzes/quizzes.service";
import { TranslationService } from "../../translation/translation.service";
import { FrontService } from "../front/front.service";
import { MyPlanBusinessRuleService } from './bussinessrule.service';

@Controller('my-plan/business-rule')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MyPlanBusinessRuleController {
    constructor(
        private readonly myPlanBusinessRuleService: MyPlanBusinessRuleService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly assessmentResultsService: AssessmentResultsService,
        private readonly activityService: ActivityService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly quickLinkService: QuickLinkService,
        private readonly quizQuizzesService: QuizQuizzesService,
        private readonly companyService: CompanyService,
        private readonly eventCategoryService: EventCategoryService,
        private readonly eventGlobalEventsService: EventGlobalEventsService,
        private readonly eventService: EventService,
        private readonly wellbeingPostService: WellBeingPostService,
        private readonly frontService: FrontService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `br.status != '2'`;
            let tableData = [tableConstant.EVENTS.TBL_EV_EVENTS,tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,tableConstant.QUICK_LINK.TBL_QUICK_LINK,tableConstant.QUIZ.TBL_QZ_QUIZZES,tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,tableConstant.TBL_USERS];
            let fields = ["br.name", "br.id", "br.biometric_id", "br.module_id", "br.organization_id", "br.activity_id", "br.status", "qz.quiz_name", "ql.title", "ar.title", "ac.activity_name", "sc.custom_cname", "events.event_name", 'users.username', 'users.first_name', 'users.last_name'];
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                postData.user_id = req.tokenUser?.id
                where += ` AND br.created_by = ${req.tokenUser?.id}`;
                tableData = [tableConstant.EVENTS.TBL_EV_EVENTS,tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,tableConstant.ACTIVITIES.TBL_ACTIVITIES,tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,tableConstant.QUICK_LINK.TBL_QUICK_LINK,tableConstant.QUIZ.TBL_QZ_QUIZZES,tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST];
                fields = ["br.name", "br.id", "br.biometric_id", "br.module_id", "br.organization_id", "br.activity_id", "br.status", "qz.quiz_name", "ql.title", "ar.title", "ac.activity_name", "sc.custom_cname", "events.event_name"];
            }
            if (postData?.search_str) {
                postData.search_str = this.commonFileService.quoteEscaper(postData?.search_str);
                where += ` AND (br.name LIKE '%${postData?.search_str}%'`;
                if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN){
                    where += ` OR CONCAT(users.first_name, ' ', users.last_name) LIKE '%${postData?.search_str}%' OR users.username LIKE '%${postData?.search_str}%'`;
                }
                where += `)`;
            }
            const resultedData = await this.myPlanBusinessRuleService.paginateList(
                fields,
                where,
                postData,
                tableData
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MyPlanBusinessRuleDto, resultedData['list'], req.lang)
            );
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateBusinessRuleInput) {
        try {
            if (!postData?.name || !postData?.biometric_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {
                name: Raw((alias) => `BINARY ${alias} = :name`, { name: postData?.name?.trim() }),
                status: Not('2'),
                ...(Object.prototype.hasOwnProperty.call(postData, 'biometric_id') && { biometric_id: postData.biometric_id }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'activity_id') && { activity_id: postData.activity_id.replace(/EVC/g, '') }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'organization_id') && { organization_id: postData.organization_id }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'module_id') && { module_id: postData.module_id }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'progress') && { progress: postData.progress }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'progress_setting') && { progress_setting: postData.progress_setting }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'c_start_date') && { c_start_date: postData.c_start_date }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'c_end_date') && { c_end_date: postData.c_end_date }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'type') && { type: postData.type }),
                ...(Object.prototype.hasOwnProperty.call(postData, 's_range') && { s_range: postData.s_range }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'e_range') && { e_range: postData.e_range }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'gender') && { gender: postData.gender }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'age') && { age: postData.age }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'ageoption') && { ageoption: postData.ageoption }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'age_s_range') && { age_s_range: postData.age_s_range }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'age_e_range') && { age_e_range: postData.age_e_range }),
            };
            const ruleCheck = await this.myPlanBusinessRuleService.findOne(where,null);
            if (ruleCheck) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RULE_ALREADY_EXIST"));
            }
            postData['created_by'] = 1;
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                postData['created_by'] = req.tokenUser?.id
            }
            postData.activity_id = postData?.activity_id && postData?.activity_id.replace(/EVC/g, '')
            await this.myPlanBusinessRuleService.save({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateBusinessRuleInput) {
        try {
            if (
                (Object.keys(postData).length === 2 && postData?.hasOwnProperty('id') && postData?.hasOwnProperty('status'))
                    ? (!postData?.id || ![0,1].includes(postData?.status))
                    : (!postData?.id || !postData?.name || !postData?.biometric_id)
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanBusinessRuleService.findOne({id: postData?.id});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            const where = {
                name: Raw((alias) => `BINARY ${alias} = :name`, { name: postData?.name?.trim() }),
                status: Not('2'),
                ...(Object.prototype.hasOwnProperty.call(postData, 'biometric_id') && { biometric_id: postData.biometric_id }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'activity_id') && { activity_id: postData.activity_id.replace(/EVC/g, '') }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'organization_id') && { organization_id: postData.organization_id }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'module_id') && { module_id: postData.module_id }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'progress') && { progress: postData.progress }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'progress_setting') && { progress_setting: postData.progress_setting }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'c_start_date') && { c_start_date: postData.c_start_date }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'c_end_date') && { c_end_date: postData.c_end_date }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'type') && { type: postData.type }),
                ...(Object.prototype.hasOwnProperty.call(postData, 's_range') && { s_range: postData.s_range }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'e_range') && { e_range: postData.e_range }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'gender') && { gender: postData.gender }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'age') && { age: postData.age }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'ageoption') && { ageoption: postData.ageoption }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'age_s_range') && { age_s_range: postData.age_s_range }),
                ...(Object.prototype.hasOwnProperty.call(postData, 'age_e_range') && { age_e_range: postData.age_e_range }),
            };
            const ruleCheck = await this.myPlanBusinessRuleService.findOne(where,null);
                if (ruleCheck) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RULE_ALREADY_EXIST"));
                }
            postData.activity_id = postData?.activity_id && postData?.activity_id.replace(/EVC/g, '')
            await this.myPlanBusinessRuleService.update({id: postData?.id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.MY_PLAN.TBL_MP_BUSINESS_RULE, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteMyPlanInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.myPlanBusinessRuleService.findOne({id: postData?.id});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.myPlanBusinessRuleService.update({id: postData?.id},{status: 2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MY_PLAN.TBL_MP_BUSINESS_RULE, req.tokenUser?.id, 'delete');
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneMyPlanInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id,status: Not('2')};
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                where['created_by'] = req.tokenUser?.id;
            }
            if(postData?.organization_id){
                where['organization_id'] = postData?.organization_id;
            }
            let resultedData = await this.myPlanBusinessRuleService.findOne(where);
            if (!resultedData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'BUSSINESS_RULE_VALIDATE'));
            }
            if (resultedData.organization_id != 0) {
                let companyData = await this.companyService.companyFindOne({id: resultedData.organization_id},['company_name']);
                resultedData['company_name'] = companyData.company_name;
            }
            let activityData: any = {};
            switch(resultedData.module_id) {
                case 1:
                    /* TODO: variable name change 1.eventCategory 2.event 3.globalEvent */
                    let resultedData1 = await this.frontService.eventCategoryData(['ec.id AS id','ec.category_name AS event_name'],{c_companies_id: resultedData.organization_id,id: resultedData.activity_id, status: Not('2')},null,null,'getRawOne');
                    if (resultedData1?.event_name) {
                            activityData['id'] = resultedData1.id;
                            activityData['event_name'] = resultedData1.event_name;
                    } else {
                        let resultedData2 = await this.frontService.eventFindOne({organization_id: postData?.organization_id,id: resultedData.activity_id, status: Not('2')}, ["id","event_name"], {id: 'ASC'});
                        if (resultedData2?.event_name) {
                            activityData['id'] = resultedData2.id;
                            activityData['event_name'] = resultedData2.event_name;
                        } else {
                            let resultedData3 = await this.frontService.globalEventsData([ "ev.id AS id", "ev.event_name AS event_name"], `ge.organization_id = '${postData?.organization_id}' AND ge.id = '${resultedData.activity_id}'  AND ge.status != '2' AND ev.status != '2'`, null,[{'join_table': 'ge.ev','alias':'ev', 'table' : tableConstant.EVENTS.TBL_EV_EVENTS, 'on_condition' : `ge.event_id = ev.id`, 'join_type': 'left_one' }],'getRawOne');
                            if (resultedData3?.event_name) {
                                activityData['id'] = resultedData3.id;
                                activityData['event_name'] = resultedData3.event_name;
                            }
                        }
                    }
                    resultedData['event_id'] = activityData?.id;
                    resultedData['event_name'] = activityData?.event_name;
                    break;
                case 2:
                    activityData = await this.assessmentResultsService.findOne({organization_id: resultedData.organization_id,status: Not('2'),type: In(['0','2']),id: resultedData.activity_id});
                    resultedData['assessment_id'] = activityData?.id;
                    if(activityData?.title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_title_${activityData.organization_id}_${activityData['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${activityData['organization_id']}`,`dynamic`);
                        activityData.title = (customeName == '' || customeName == `assessment_title_${activityData.organization_id}_${activityData['id']}`) ? activityData['title'] : customeName;
                    }    
                    resultedData['assessment_name'] = activityData?.title;
                    break;
                case 3:
                    activityData = await this.activityService.activityFindOne({category_id: '20',status: Not('2'),accebility: '0',id: resultedData.activity_id},["id","activity_name"],{id: 'ASC'});
                    resultedData['activity_id'] = activityData?.id;
                    resultedData['activity_name'] = activityData?.activity_name;
                    break;
                case 4:
                    activityData = await this.frontService.ScheduleChallengeData(['sc.id AS id','sc.custom_cname AS custom_cname'],`sc.org_id = ${resultedData.organization_id} AND sc.id = ${resultedData.activity_id} AND sc.status != '2'`,null,null,'getRawOne');
                    resultedData['challenge_id'] = activityData?.id;
                    resultedData['challenge_name'] = activityData?.custom_cname;
                    break;
                case 5:
                    activityData = await this.quickLinkService.quickLinkFindOne(["id","title"],{c_companies_id: resultedData.organization_id,id: resultedData.activity_id,status: Not('2')},{id: 'ASC'});
                    resultedData['quick_link_id'] = activityData?.id;
                    resultedData['quick_link_name'] = activityData?.title;
                    break;
                case 6:
                    let code = await this.companyService.getCompanyCodeFromId(resultedData.organization_id);
                    activityData = await this.quizQuizzesService.findOne(`aqo.organization_id = '${code}' AND qs.id = '${resultedData.activity_id}' AND aqo.status != '2' AND qs.status != '2'`,{id: 'ASC'},[tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG]);
                    if(activityData?.quiz_name){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`quiz_name_${activityData.id}`, `/LC_MESSAGES/Quizzes/Quizzes/0/${activityData['id']}`,`dynamic`);
                        activityData.quiz_name = (customeName == '' || customeName == `quiz_name_${activityData.id}`) ? activityData['quiz_name'] : customeName;
                    }
                    resultedData['quiz_id'] = activityData?.id;
                    resultedData['quiz_name'] = activityData?.quiz_name;
                    break;
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MyPlanBusinessRuleDto, resultedData, req.lang)
            );
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListMyPlanInput) {
        try {
            if (!postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where: any = { organization_id: In([0, postData?.organization_id]), status: '1'};
            if ([appConstant.ROLE.GLOBALCOACH,appConstant.ROLE.COACH].includes(req.tokenUser?.role_id)) {
                where['created_by'] = req.tokenUser?.id;
            }
            const order = postData && postData?.order ? postData?.order : 'ASC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.myPlanBusinessRuleService.listRecord(["id","biometric_id","module_id","organization_id","activity_id","name","c_start_date","c_end_date","s_range","e_range","type","age_s_range","age_e_range","gender","age","progress","progress_setting"],where, { [orderBy]: order });
            let progressData = ['Overall','Loss','Gain'];
            let progressSettingData = ['All','Past 12 months','Custom date range'];
            let typeData = ['Range','Less Than','Greater Than','Admin upload','User upload'];
            let genderData = ['All','Male','Female','Others'];
            let ageData = ['All','Custom','Custom','Custom'];
            let bioData = {'25':'Org Specific', '1':'Height', '2':'Weight', '3':'BMI', '4':'Systolic', '5':'Diastolic', '6':'Random Blood Glucose', '7':'A1C', '8':'Total Cholesterol', '9':'HDL Cholesterol', '10':'LDL Cholesterol', '11':'Triglycerides', '12':'Waist Circumference', '13':'HRA - Current Health', '14':'HRA - Prevention', '15':'HRA - Nutrition', '16':'HRA - Exercise', '17':'HRA - Emotional Health', '19':'Tobacco Affidavit', '20':'Physician form', '21':'Dental form', '22':'Optimetric form', '26':'Fasting Blood Glucose','30':'Online Health Assessment'};
            let moduleData = [],responseData= [];
            for (let i = 0; i < resultedData.length; i++) {
                if (resultedData[i].biometric_id != 25) {
                    resultedData[i].name += ` - ${bioData[resultedData[i].biometric_id]}`;
                    if (resultedData[i].biometric_id >= 1 && resultedData[i].biometric_id <= 12 || resultedData[i].biometric_id == 26) {
                        resultedData[i].name += ` - ${progressData[resultedData[i].progress]}`;
                        if ([1,2].includes(resultedData[i].progress)) {
                            resultedData[i].name += ` - ${progressSettingData[resultedData[i].progress_setting]}`;
                            if (resultedData[i].progress_setting == 2) {
                                resultedData[i].name += ` : ${this.commonDateService.DateTimeFormat(resultedData[i].c_start_date,'YYYY-MM-DD HH:mm:ss')} To ${this.commonDateService.DateTimeFormat(resultedData[i].c_end_date,'YYYY-MM-DD HH:mm:ss')}`;
                            }
                            resultedData[i].name += ` Value : ${resultedData[i].s_range}`;
                        } else {
                            resultedData[i].name += ` ${typeData[resultedData[i].type]}`;
                            if (resultedData[i].type == 0) {
                                resultedData[i].name += ` : ${resultedData[i].s_range} To ${resultedData[i].e_range}`;
                            } else {
                                resultedData[i].name += ` Value : ${resultedData[i].s_range}`;
                            }
                        }
                    }
                }
                resultedData[i].name += ` - Gender : ${genderData[resultedData[i].gender]}`;
                resultedData[i].name += ` - Age : ${ageData[resultedData[i].age]}`;
                if(resultedData[i].age != 0){
                    resultedData[i].name += ` - ${resultedData[i].age_s_range}`;
                    if(resultedData[i].age == 5){
                        resultedData[i].name += ` To ${resultedData[i].age_e_range}`;
                    }
                }
                if (resultedData[i].biometric_id == 25 && resultedData[i]?.module_id != 0) {
                    let ruleType = [];
                    if (moduleData[resultedData[i].module_id]) {
                        ruleType = moduleData[resultedData[i].module_id].rule_type;
                    }
                    moduleData[resultedData[i].module_id] = {id:resultedData[i].module_id,name: appConstant.MODULE_DATA[resultedData[i].module_id],rule_type: [...ruleType, {id: resultedData[i].id, name: resultedData[i].name}]};
                } else {
                    responseData.push(resultedData[i])
                }
            }
            responseData = <any>(
                await this.commonArrayService.formatToDto(MyPlanBusinessRuleDto, responseData, req.lang)
            );
            responseData = [{id:0,name: 'Module Specific',module_list: moduleData.filter(item => item !== null)}, ...responseData];
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: responseData,
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('activity-get')
    async activity_get(@Req() req: Request, @Res() res: Response, @Body() postData: ActivitygetInput) {
        try {
            if (!postData?.module_id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData;
            switch(postData?.module_id) {
                case 1:
                    /* TODO: variable name change 1.eventCategory 2.event 3.globalEvent */
                    let resultedData1 = await this.eventCategoryService.listRecord(['e_category.id','e_category.category_name'],{c_companies_id: postData?.organization_id, status: Not('2')},{ id: 'ASC' });
                    let resultedData2 = await this.eventService.eventsList(["event.id","event.event_name"],{organization_id: postData?.organization_id, status: Not('2')},{id: 'ASC'});
                    let resultedData3 = await this.eventGlobalEventsService.listRecord(["ge.id","ev.id","ev.event_name"],`ge.organization_id = '${postData?.organization_id}' AND ge.status != '2' AND ev.status != '2'`,{ id: 'ASC' },[tableConstant.EVENTS.TBL_EV_EVENTS]);
                    await Promise.all(resultedData2.map(async (ele)=>{
                        if(ele.event_name){
                            let customeName = await this.translatorService.frontendReadTranslation(req.lang,`event_name_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['org_id']}/${ele['id']}`,`dynamic`);
                            ele.event_name = (customeName == '' || customeName == `event_name_${ele['id']}`) ? ele['event_name'] : customeName;
                        }
                    }));
                    if(resultedData1 && resultedData1.length){
                        await Promise.all(resultedData1.map(async (ele)=>{
                            if(ele.category_name){
                                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${ele['id']}`, `/LC_MESSAGES/Events/Category/${ele['c_companies_id']}/${ele['id']}`,`dynamic`);
                                ele.category_name = (customeName == '' || customeName == `category_name_${ele['id']}`) ? ele['category_name'] : customeName;
                            }
                        }));
                    }
                    for (let i = 0; i < resultedData1.length; i++) {
                        resultedData1[i].id = `EVC${resultedData1[i].id}`
                        resultedData1[i].title = resultedData1[i].category_name
                        resultedData1[i].select_status = 'Select Category'
                        delete resultedData1[i].category_name;
                    }
                    for (let i = 0; i < resultedData2.length; i++) {
                        resultedData2[i].title = resultedData2[i].event_name
                        resultedData2[i].select_status = 'Select Event'
                        delete resultedData2[i].event_name
                    }
                    for (let i = 0; i < resultedData3.length; i++) {
                        resultedData3[i].id = resultedData3[i].ev.id
                        resultedData3[i].title = resultedData3[i].ev.event_name
                        resultedData3[i].select_status = 'Select Global Event'
                        delete resultedData3[i].ev
                    }
                    resultedData = [...resultedData1,...resultedData2,...resultedData3]
                    break;
                case 2:
                    resultedData = await this.assessmentResultsService.listRecord({organization_id: postData?.organization_id,status: Not('2'),type: In(['0','2'])},['id','title'],{id: 'ASC'});
                    break;
                case 3:
                    resultedData = await this.activityService.activityListRecord({category_id: '20',status: Not('2'),accebility: '0'},["id","activity_name"],{id: 'ASC'});
                    for (let i = 0; i < resultedData.length; i++) {
                        resultedData[i].title = resultedData[i].activity_name
                        delete resultedData[i].activity_name
                    }
                    break;
                case 4:
                    resultedData = await this.scheduleChallengeService.findChallenge({org_id: postData?.organization_id,status: Not('2')},['id','custom_cname'],{ id: 'ASC' });
                    for (let i = 0; i < resultedData.length; i++) {
                        resultedData[i].title = resultedData[i].custom_cname
                        delete resultedData[i].custom_cname
                    }
                    break;
                case 5:
                    resultedData = await this.quickLinkService.quickLinkListRecord(["id","title"],{c_companies_id: postData?.organization_id,status: Not('2')},{id: 'ASC'});
                    break;
                case 6:
                    let code = await this.companyService.getCompanyCodeFromId(postData?.organization_id);
                    resultedData = await this.quizQuizzesService.listRecord(['qz.id','qz.quiz_name'],`aqo.organization_id = '${code}' AND aqo.status != '2' AND qz.status != '2'`,{id: 'ASC'},[tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG]);
                    for (let i = 0; i < resultedData.length; i++) {
                        resultedData[i].title = resultedData[i].quiz_name
                        delete resultedData[i].quiz_name
                    }
                    break;
                case 7:
                    let hraData = [];
                    for (let i = 1; i < Object.keys(appConstant.HRA_DATA).length; i++) {
                        hraData.push({id: Object.keys(appConstant.HRA_DATA)[i - 1], title: appConstant.HRA_DATA[i]})
                    }
                    resultedData = hraData;
                    break;
                case 8:
                    let bioArray = [];
                    for (let i = 1; i < Math.max(...Object.keys(appConstant.BIO_DATA).map(Number)); i++) {
                        if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 26].includes(i)) {
                            bioArray.push({id: Object.keys(appConstant.BIO_DATA).find(key => appConstant.BIO_DATA[key] === appConstant.BIO_DATA[i]), title: appConstant.BIO_DATA[i]})
                        }
                    }
                    resultedData = bioArray;
                    break;
                case 9:
                    let where = `ep.status = '1' AND coach.status != '2'`;
                    if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                        where +=` AND coach.coach_manager_id = '${req.tokenUser?.id}' AND company.id = '${postData?.organization_id}' `;
                    } else {
                        where += ` AND coach.coach_manager_id  != '0' AND company.id = '${postData?.organization_id}' `;
                    }
                    resultedData = await this.wellbeingPostService.listRecord(where,["ep.id AS id","ep.title AS title","company.company_name AS company_name"],{id: "ASC"},[tableConstant.COACH.TBL_CO_COACHES,tableConstant.COMPANIES.TBL_COMPANY]);
                    resultedData.unshift({id: 0,title:'All Emotional Well-Being'})
                    resultedData = <any>(
                        await this.commonArrayService.formatToDto(WellBeingPostDto, resultedData, req.lang)
                    );
                    if(resultedData && resultedData.length){
                        await Promise.all(resultedData.map(async (ele)=>{
                            if(ele.title){
                                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${ele['cat_id']}_${ele['id']}_${ele['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                                ele.title = (customeName == '' || customeName == `post_title_${ele['cat_id']}_${ele['id']}_${ele['org_id']}`) ? ele['title'] : customeName;
                            }
                            if(ele.link_title){
                                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_linktitle_${ele['cat_id']}_${ele['id']}_${ele['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                                ele.link_title = (customeName == '' || customeName == `post_linktitle_${ele['cat_id']}_${ele['id']}_${ele['org_id']}`) ? ele['link_title'] : customeName;
                            }
                            if(ele.short_desc){
                                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_shortdesc_${ele['cat_id']}_${ele['id']}_${ele['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                                ele.short_desc = (customeName == '' || customeName == `post_shortdesc_${ele['cat_id']}_${ele['id']}_${ele['org_id']}`) ? ele['short_desc'] : customeName;
                            }
                            if(ele.more_desc){
                                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_moredesc_${ele['cat_id']}_${ele['id']}_${ele['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                                ele.more_desc = (customeName == '' || customeName == `post_moredesc_${ele['cat_id']}_${ele['id']}_${ele['org_id']}`) ? ele['more_desc'] : customeName;
                            }
                        }));
                    }
                    break;
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}