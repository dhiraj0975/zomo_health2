import {
    appConstant,
    AssessmentsDto,
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
    Inject,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { CompanyService } from "src/modules/company/companies/company.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { In, Like, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import {
    CreateAssessmentOptionsInput,
    CreateAssessmentsInput,
    PaginateWithHealthAssessmentInput
} from "../../../input";
import { ActivityService } from "../../activity/activity/activity.service";
import { SettingsService } from "../../company/settings/settings.service";
import { BiometricsService } from "../../healthcheckup/biometrics/biometrics.service";
import { ThemeSettingsService } from "../../themes/themesettings/themesettings.service";
import { TranslationService } from "../../translation/translation.service";
import { UserService } from '../../user/user/user.service';
import { AssessmentEmotionalAssessmentService } from "../assessmentemotionalassessment/assessmentemotionalassessment.service";
import { AssessmentHaOptionsService } from "../assessmenthaoptions/assessmenthaoptions.service";
import { AssessmentHraBiometricService } from "../assessmenthrabiometrics/assessmenthrabiometric.service";
import { AssessmentResultsService } from "../assessmentresults/assessmentresults.service";
import { AssessmentTextsService } from "../assessmenttexts/assessmenttexts.service";
import { FrontService } from "../front/front.service";
import { LmspecificmetricsService } from "../lmspecificmetrics/lmspecificmetrics.service";
import { AssessmentsService } from "./assessments.service";
@Controller('health-assessment/assessments')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentsController {
    constructor(
        private readonly assessmentsService: AssessmentsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly companyService: CompanyService,
        private readonly assessmentTextsService: AssessmentTextsService,
        private readonly biometricsService: BiometricsService,
        private readonly assessmentHraBiometricsService: AssessmentHraBiometricService,
        private readonly activityService: ActivityService,
        private readonly assessmentOptionsService: AssessmentHaOptionsService,
        private readonly userService: UserService,
        private readonly themeSettingsService: ThemeSettingsService,
        private readonly assessmentResultsService: AssessmentResultsService,
        private readonly assessmentEmotionalAssessmentService: AssessmentEmotionalAssessmentService,
        private readonly activityLogService: ActivityLogService,
        private readonly companySettingsService: SettingsService,
        private readonly lmspecificmetricsService: LmspecificmetricsService,
        private readonly frontService: FrontService,
        @Inject('CRON_SERVICE') private cronMicroservice: ClientProxy,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ` `;
            if (postData?.user_id) {
                where += `healthassessment.user_id = '${postData?.user_id}`;
            }
            if (postData?.search_str) {
                let condition = `healthassessment.1 LIKE '%${postData?.search_str}%' OR healthassessment.2 LIKE '%${postData?.search_str}%' OR healthassessment.3 LIKE '%${postData?.search_str}%' OR healthassessment.4 LIKE '%${postData?.search_str}%' OR healthassessment.5 LIKE '%${postData?.search_str}%'`;
                where += postData?.user_id ? `AND(` + condition + `)` : condition;
            }
            const resultedData = await this.assessmentsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentsDto, resultedData['list'], req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            if (!postData?.id && !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? { id: postData?.id, status: Not(2) } : { user_id: postData?.user_id, status: Not(2) };
            let biometricDetails = await this.assessmentsService.findOne(where);
            if (!biometricDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(AssessmentsDto, biometricDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: biometricDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentsInput) {
        try {
            if (
                !postData?.user_id ||
                !postData?.activity_id ||
                !postData['1'] ||
                !postData['1_WorstScore'] ||
                !postData['2'] ||
                !postData['2_WorstScore'] ||
                !postData['3'] ||
                !postData['3_WorstScore'] ||
                !postData['4'] ||
                !postData['4_WorstScore'] ||
                !postData['5'] ||
                !postData['5_WorstScore'] ||
                !postData['6'] ||
                !postData['6_WorstScore'] ||
                !postData['7'] ||
                !postData['8'] ||
                !postData['9'] ||
                !postData?.score ||
                !postData?.hra_reset ||
                !postData?.hra_status ||
                !postData?.language_set ||
                !postData?.date
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.assessmentsService.save({ ...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id });
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
            const where = { id: postData?.id, status: Not(2) };
            const recordDetails = await this.assessmentsService.findOne(where);
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
            await this.assessmentsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, { na: recordDetails }, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENTS, req.tokenUser?.id, 'delete')
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentOptionsInput) {
        try {
            if (!postData?.user_id || ['1', '2', '3', '4', '5'].some(field => postData[field] == '')) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let userData = await this.userService.findUserRecord({ id: postData?.user_id }, ['dob', 'gender']);
            if (!userData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_DOB_VALIDATION"));
            }
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            postData.language_set = 1; /*def 1 add */
            postData.hra_reset = 0; /*def 0 add 1 to reset */
            let companySettings: any = await this.companySettingsService.findOne({org_id:postData?.org_id},['health_a_based_on']);
            let urDOB: any = userData.dob;
            let gender: any = userData.gender;
            let extraCondition = {show: In([0,2])}
            if (gender == 'm') {
                extraCondition = {show: In([0,1])};
            }
            urDOB = this.commonDateService.calculateUserAge(urDOB);
            let where = { user_id: postData?.user_id,hra_reset: 0, status: Not(2) };
            if (postData?.id) {
                where['id'] = postData?.id
            }
            const recordDetails = await this.assessmentsService.findOne(where, [], { id: 'DESC' });
            const recordData = JSON.parse(JSON.stringify(recordDetails));
            let assessmentId = null
            let fieldNum: any = '';
            let qId = ['1', '2', '3', '4', '5'].find(key => String(key) in postData)
            let count = 0;
            if (recordDetails) {
                let currentData = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD');
                let created = await this.commonDateService.DateTimeFormat(recordDetails?.date,'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss');
                if (companySettings?.health_a_based_on == '0') {
                    if (currentData == created) {
                        assessmentId = recordDetails.id;
                    }
                } else {
                    for (let i = 1; i <= 5; i++) {
                        if (!recordDetails[i.toString()]) {
                            assessmentId = recordDetails.id;
                        }
                    }
                }
                if (recordDetails?.hra_status >= 100) {
                    if (currentData != created) {
                        assessmentId = null;
                    }
                }
                for (let i = 1; i <= 5; i++) {
                    if (postData[i.toString()]) {
                        fieldNum = postData[i.toString()];
                    }
                    if (recordDetails[i.toString()] || fieldNum) {
                        count++;
                    }
                }
            } else {
                count = 1;
            }
            postData.date = new Date().toString();
            /* TODO manage na field*/
            let hraStatus = Math.min(parseFloat(((100 / 5) * count).toFixed(2)), 100);
            postData.hra_status = hraStatus;
                if (String(hraStatus) == '100') {
                    const actId = await this.activityService.activityFindOne({ activity_name: 'User Upload - Health Risk Assessment' }, ['id']);
                    if (actId) {
                        postData.activity_id = actId['id'];
                    }
                }
                if (companySettings?.health_a_based_on == 1) {
                    postData.date = new Date().toString();
                }
            let assessmentOptionData: any = await this.assessmentOptionsService.listRecord({ id: In(fieldNum.split(',')) }, null, ['question_id', 'algo_value']);
            if (assessmentOptionData) {
                let aoData = {};
                for (let i = 0; i < assessmentOptionData.length; i++) {
                    const { question_id, algo_value } = assessmentOptionData[i];
                    aoData[question_id] = (aoData[question_id] || 0) + algo_value;
                }
                let ids = Object.keys(aoData);
                let assessmentQuestionsData = await this.frontService.assessmentHaQuestionsListRecord( { id: In(ids) },['id','age_considered','age_condition','age_limit']);
                let algoVal = 0;
                for (let i = 0; i < assessmentQuestionsData.length; i++) {
                    if (assessmentQuestionsData[i].age_considered == 0) {
                        algoVal = Number(algoVal) + Number(aoData[assessmentQuestionsData[i].id]);
                    } else {
                        let ageLimit = assessmentQuestionsData[i].age_limit;
                        let ageCondition = assessmentQuestionsData[i].age_condition;
                        let ageResult = false;
                        let ageConditions = {
                            "1": urDOB > ageLimit,
                            "2": urDOB >= ageLimit,
                            "3": urDOB < ageLimit,
                            "4": urDOB <= ageLimit,
                            "5": urDOB == ageLimit,
                        }
                        ageResult = ageConditions[ageCondition.toString()] || false;
                        if (ageResult) {
                            algoVal = Number(algoVal) + Number(aoData[assessmentQuestionsData[i].id]);
                        }
                    }
                }
                postData[`${qId}_qscore`] = Number(algoVal);
            }
            let totalWorst: number = 0;
            /* language_id old fun not use*/
            let assessmentQuestionData = await this.frontService.assessmentHaQuestionsListRecord( {...{language_id: '1', questioncat_id: qId, status: Not('2')},...extraCondition},['id','type','main_question_id'],{'order': 'ASC'});
            if (assessmentQuestionData) {
                for (let i = 0; i < assessmentQuestionData.length; i++) {
                    let assessmentOptionData
                    if (String(assessmentQuestionData[i].main_question_id) == '0') {
                        assessmentOptionData = await this.assessmentOptionsService.listRecord({ parent_id: '0', question_id: assessmentQuestionData[i].id, status: Not('2') }, {'order': 'ASC'}, ['algo_value']);
                    } else {
                        assessmentOptionData = await this.assessmentOptionsService.listRecord({ parent_id: '0', question_id: assessmentQuestionData[i].id,main_option_id: Not('0'), status: Not('2') }, {'order': 'ASC'}, ['algo_value']);
                    }
                    let minValRadio = [];
                    let minValCheckBox = [];
                    let minValDropDown = [];
                    let minValMultiDropDwn = [];
                    let valueArrays = {
                        '0': minValRadio,
                        '1': minValCheckBox,
                        '2': minValDropDown,
                        '3': minValMultiDropDwn
                    };
                    for (let j = 0; j < assessmentOptionData.length; j++) {
                        let type = assessmentQuestionData[i]['type'];
                        if (valueArrays.hasOwnProperty(type)) {
                            valueArrays[type].push(assessmentOptionData[j]['algo_value']);
                        }
                    }
                    let minRadio: number = minValRadio.length > 0 ? Math.min(...minValRadio) : 0;
                    let minDropDown: number = minValDropDown.length > 0 ? Math.min(...minValDropDown) : 0;
                    let minCheckBox: number = minValCheckBox.length > 0 ? Math.min(...minValCheckBox) : 0;
                    let minMultiDrpDwn: number = minValMultiDropDwn.length > 0 ? Math.min(...minValMultiDropDwn) : 0;
                    const calcCount = async (valueArray, minValue) => {
                        return valueArray.reduce((count, val) => (val === minValue ? count + 1 : count), 0);
                    }
                    let count4Check: number = await calcCount(minValCheckBox, minCheckBox);
                    let count4MultiDrop: number = await calcCount(minValMultiDropDwn, minMultiDrpDwn);
                    let worstCheckBox: number = minCheckBox * count4Check;
                    let worstMultiDrop: number = minMultiDrpDwn * count4MultiDrop;
                    totalWorst += (worstCheckBox + worstMultiDrop + minRadio + minDropDown);
                }
                postData[`${qId}_WorstScore`] = Number(totalWorst);
            }
            if (!assessmentId) {
                await this.assessmentsService.save({ ...postData });
            } else {
                if (recordDetails.id) {
                    where['id'] = assessmentId
                }
                await this.assessmentsService.update(where, { ...postData });
                this.activityLogService.create(recordData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENTS, req.tokenUser?.id);
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { status: Not(2)};
            if (postData?.user_id) {
                where['user_id'] = postData?.user_id
            }
            let resultedData = await this.assessmentsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentsDto, resultedData, req.lang)
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
    @Post('HRA-Reset')
    async HRAReset(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                if (postData?.flag == 'hra_reset') {
                    if (!postData?.org_id) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                    }
                    let assessmentsData = await this.frontService.assessmentsData(['MAX(ha.id) AS max_id','ha.hra_reset AS hra_reset'], `user.role_id IN (2, 16) AND user.status = '1' AND user.org_id  = '${postData?.org_id}' AND ha.hra_reset = '0'`, null,[{'join_table': 'ha.user','alias':'user', 'table' : tableConstant.TBL_USERS, 'on_condition' : `user.id = ha.user_id`, 'join_type': 'left_one' }],'getRawMany','ha.user_id' );
                    let assessmentsIds = [];
                    for (let i = 0; i < assessmentsData.length; i++) {
                        assessmentsIds.push(assessmentsData[i].max_id);
                    }
                    await this.assessmentsService.update({id: In(assessmentsIds), hra_reset: Not('1')},{hra_reset: 1});
                    for (let i = 0; i < assessmentsData.length; i++) {
                        this.activityLogService.create(assessmentsData[i], {hra_reset: 1}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENTS, req.tokenUser?.id, 'delete');
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_HRA_RESET"),
                    });
                }
                let message = 'success';
                let where = ``;
                let companyWhere = `company.deleted = 0 AND company.status = 1 AND activeplugin.plugin_name LIKE '%"Hra":1%'`;
                if (postData?.flag_status == '1') {
                    where += ` hra.id != 0 AND hra.hra_reset = 0`;
                    companyWhere += ` AND company.companytype_id = '3'`;
                } else {
                    where += ` eha.id != 0 AND eha.eha_reset = 0`;
                }
                if (!postData?.org_id) {
                    const companyData = await this.companyService.listRecord(companyWhere);
                    postData.org_id = companyData && companyData.length ? companyData.map((e) => e.id).join(',') : '';
                }
                if (postData?.org_id && postData?.org_id != '') {
                    where += ` AND user.org_id IN(${postData?.org_id.split(',')})`;
                }
                if (postData?.dept_id && postData?.dept_id != '') {
                    where += ` AND user.department_id IN(${postData?.dept_id.split(',')})`;
                }
                if (postData?.loc_id && postData?.loc_id != '') {
                    where += ` AND user.location IN(${postData?.loc_id.split(',')})`;
                }
                if (postData?.status == '1') {
                    where += ` AND user.status = '${postData?.status}'`;
                }
                if (postData?.search_str) {
                    where += ` AND(CONCAT(user.first_name, ' ', user.last_name) LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%' OR department.dept_name LIKE '%${postData?.search_str}%' OR location.location_name LIKE '%${postData?.search_str}%')`;
                }
                let response = {};
                /* HRA pagination & reset*/
                if (postData?.flag_status == '1') {
                    let fields = ['hra.id', 'hra.hra_status', 'hra.date', 'user.id', 'user.code', 'user.first_name', 'user.middle_name', 'user.last_name', 'user.username', 'user.gender', 'user.email', 'user.dob', 'user.date_of_hire', 'user.employeeid', 'user.user_type', 'user.on_insurance_plan', 'user.insurance_plan_name', 'company.id', 'company.company_name', 'settings.jobtitle', 'department.id', 'department.dept_name', 'location.id', 'location.location_name'];
                    let resultedData = await this.frontService.HRAReset(where, null, fields, ((postData?.page || postData?.limit) && postData?.reset != 1) ? { page: postData?.page, limit: postData?.limit } : null);
                    const [result, total] = resultedData;
                    response = this.commonArrayService.paginationResponse(result, total, { take: postData?.limit || 10, page: postData?.page || 1 });
                    if (postData?.reset) {
                        for (let i = 0; i < result.length; i++) {
                            let hra = result[i]['hra']
                            for (let j = 0; j < hra.length; j++) {
                                await this.assessmentsService.update({ id: hra[j]['id'] }, { hra_reset: 1 });
                                this.activityLogService.create(hra, { hra_reset: 1 }, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENTS, req.tokenUser?.id);
                            }
                        }
                        message = await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_HRA_RESET");
                        response = this.commonArrayService.paginationResponse([], total, { take: postData?.limit || 10, page: postData?.page || 1 });
                    }
                } else {
                    /* EHA pagination & reset*/
                    let fields = ['eha.id', 'eha.hra_status', 'eha.created', 'user.id', 'user.code', 'user.first_name', 'user.middle_name', 'user.last_name', 'user.username', 'user.gender', 'user.email', 'user.dob', 'user.date_of_hire', 'user.employeeid', 'user.user_type', 'user.on_insurance_plan', 'user.insurance_plan_name', 'company.id', 'company.company_name', 'department.id', 'department.dept_name', 'location.id', 'location.location_name'];
                    let resultedData = await this.frontService.EHAReset(where, null, fields, ((postData?.page || postData?.limit) && postData?.reset != 1) ? { page: postData?.page, limit: postData?.limit } : null);
                    const [result, total] = resultedData;
                    response = this.commonArrayService.paginationResponse(result, total, { take: postData?.limit || 10, page: postData?.page || 1 });
                    if (postData?.reset) {
                        for (let i = 0; i < result.length; i++) {
                            let eha = result[i]['eha']
                            for (let j = 0; j < eha.length; j++) {
                                await this.assessmentEmotionalAssessmentService.update({ id: eha[j]['id'] }, { eha_reset: 1 });
                                this.activityLogService.create(eha, { eha_reset: 1 }, tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS, req.tokenUser?.id);
                            }
                        }
                        message = await this.translatorService.frontendReadTranslation(req.lang, "SUCCESS_EHA_RESET");
                        response = this.commonArrayService.paginationResponse([], total, { take: postData?.limit || 10, page: postData?.page || 1 });
                    }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: response,
                    message: message,
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    @Post('results')
    async results(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const userId = postData?.user_id ?? req.tokenUser?.id;
            if (!userId || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (postData?.status == '1') {
                let checkExist: any = await this.frontService.assessmentResultsExists({
                    organization_id: postData?.org_id,
                    status: '1'
                });
                if (!checkExist) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: {display_result: 0},
                        message: 'success',
                    });
                }
            }
            let screeningResults = [];
            let bioWhere: any = [
                { user_id: userId, alc: Not('') },
                { user_id: userId, bmi: Not('') },
                { user_id: userId, systolic: Not('') },
                { user_id: userId, diastolic: Not('') },
                { user_id: userId, total_cholesterol: Not('') },
                { user_id: userId, hdl: Not('') },
                { user_id: userId, ldl: Not('') },
                { user_id: userId, triglycerides: Not('') },
                { user_id: userId, blood_glucose: Not('') },
            ];
            let hraWhere: any = [
                { user_id: userId, weight: Not('') },
                { user_id: userId, alc: Not('') },
                { user_id: userId, bp_systolic: Not('') },
                { user_id: userId, bp_diastolic: Not('') },
                { user_id: userId, total_cholesterol: Not('') },
                { user_id: userId, hdl: Not('') },
                { user_id: userId, ldl: Not('') },
                { user_id: userId, triglycerides: Not('') },
                { user_id: userId, blood_glucose: Not('') },
            ];
            if (postData?.bio_id) {
                bioWhere = [
                    { id: postData?.bio_id, user_id: userId, alc: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, bmi: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, systolic: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, diastolic: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, total_cholesterol: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, hdl: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, ldl: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, triglycerides: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, blood_glucose: Not(''), status: Not(2) },
                ]
                hraWhere = [
                    { id: postData?.bio_id, user_id: userId, weight: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, alc: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, bp_systolic: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, bp_diastolic: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, total_cholesterol: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, hdl: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, ldl: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, triglycerides: Not(''), status: Not(2) },
                    { id: postData?.bio_id, user_id: userId, blood_glucose: Not(''), status: Not(2) },
                ];
            }
            let biometricsData: any = await this.biometricsService.findOne(bioWhere, { created: 'DESC' }, ["id", "bmi", "systolic", "diastolic", "blood_glucose", "alc", "total_cholesterol", "hdl", "ldl", "triglycerides", "created"]);
            if (biometricsData) {
                screeningResults.push(biometricsData);
            }
            let HraData: any = await this.assessmentHraBiometricsService.findOne(hraWhere, ["id", "alc", "weight", "height_ft", "height_in", "bp_systolic", "bp_diastolic", "total_cholesterol", "hdl", "ldl", "triglycerides", "blood_glucose", "waist", "source", "date"], { date: 'DESC' });
            if (HraData) {
                let bmi: number = 0;
                if (HraData.weight) {
                    let weight: number = Number(HraData.weight);
                    let ft: number = Number(HraData.height_ft);
                    let inch: number = Number(HraData.height_in);
                    let inFT: number = ft * 12;
                    let totalInches: number = inFT + inch;
                    bmi = parseFloat(((weight / (totalInches * totalInches)) * 703).toFixed(2));
                }
                let bioData = {
                    alc: HraData.alc,
                    bmi: bmi,
                    id: HraData.id,
                    systolic: HraData.bp_systolic,
                    diastolic: HraData.bp_diastolic,
                    total_cholesterol: HraData.total_cholesterol,
                    hdl: HraData.hdl,
                    ldl: HraData.ldl,
                    triglycerides: HraData.triglycerides,
                    blood_glucose: HraData.blood_glucose,
                    source: HraData.source,
                    created: HraData.date,
                };
                screeningResults.push(bioData);
            }
            if (screeningResults.length >= 1) {
                screeningResults = this.commonService.dynamicSort(screeningResults, (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
                screeningResults = screeningResults[0]
            }
            let where = { user_id: userId, status: Not(2) };
            let themeSettingsData: any = await this.themeSettingsService.findOne({ org_id: postData?.org_id }, ['progress_hra_low_color', 'progress_hra_mod_color', 'progress_hra_high_color', 'progress_hra_very_high_color', 'progress_very_high_color']);
            if (!themeSettingsData) {
                themeSettingsData = { 'progress_hra_low_color': '#611a6b', 'progress_hra_mod_color': '#FFB848', 'progress_hra_high_color': '#E34D43', 'progress_hra_very_high_color': '#E02222', 'progress_very_high_color': '#734702' }
            }
            let field = { field_1: null, field_2: null, field_3: null, field_4: null, field_5: null };
            /* status 0 HRA*/
            if (postData?.status == '0') {
                if (screeningResults.length > 0 && postData?.bio_id) {
                    where['date'] = Like('%' + await this.commonDateService.DateTimeFormat(screeningResults?.[0]?.['created'], 'YYYY-MM-DD') + '%')
                }
                if (postData?.assess_date) {
                    where['date'] = Like('%' + await this.commonDateService.DateTimeFormat(postData?.assess_date, 'YYYY-MM-DD') + '%')
                }
                let resultedData = await this.assessmentsService.listRecord(where, { 'healthassessment.date': 'DESC' });
                if (Object.keys(screeningResults).length == 0 && resultedData.length == 0) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: {status: 0},
                        message: 'success',
                    });
                }
                let todayDataFound = false;
                let completedFound = false;
                let currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD');
                if (resultedData && resultedData.length > 0) {
                    for (let assessment of resultedData) {
                        let asseCreatedDate = await this.commonDateService.DateTimeFormat(assessment['date'], 'YYYY-MM-DD');
                        if (todayDataFound) {
                            if (currentDate != asseCreatedDate) {
                                break;
                            }
                        }
                        if (currentDate == asseCreatedDate) {
                            todayDataFound = true;
                        }
                        ['1', '2', '3', '4', '5'].forEach(number => {
                            if (assessment[`${number}_qscore`] !== null && field[`field_${number}`] === null) {
                                if (assessment[`${number}_WorstScore`] == '0') {
                                    field[`field_${number}`] = '100'
                                } else {
                                    field[`field_${number}`] = Math.round((1 - (assessment[`${number}_qscore`] / assessment[`${number}_WorstScore`])) * 100).toString();
                                }
                            }
                        });
                        if (assessment['hra_status'] == 100) {
                            completedFound = true;
                            break;
                        }
                    }
                    if (!todayDataFound && !completedFound) {
                        let assessment = resultedData[0];
                        let field = { field_1: null, field_2: null, field_3: null, field_4: null, field_5: null };
                        ['1', '2', '3', '4', '5'].forEach(number => {
                            if (assessment[`${number}_qscore`] !== null && field[`field_${number}`] === null) {
                                if (assessment[`${number}_WorstScore`] == '0') {
                                    field[`field_${number}`] = '100'
                                } else {
                                    field[`field_${number}`] = Math.round((1 - (assessment[`${number}_qscore`] / assessment[`${number}_WorstScore`])) * 100).toString();
                                }
                            }
                        });
                    }
                }
            }
            let assessmentResultsData = [], screeningResultsData = [];
            /* status 1 EHA*/
            if (postData?.status == '1') {
                let userTimeZone: string = req.tokenUser?.timezone || 'UTC';
                if (postData?.user_id) {
                    let getUserTimeZone:UserEntity | null = await this.userService.getOne({id: userId},['timezone'])
                    userTimeZone = getUserTimeZone?.timezone || 'UTC';
                }
                if (screeningResults.length > 0 && postData?.bio_id) {
                    where['created'] = Like('%' + await this.commonDateService.DateTimeFormat(new Date(screeningResults?.[0]?.['created']), 'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss',userTimeZone,1) + '%')
                }
                if (postData?.assess_date) {
                    where['created'] = Like('%' + await this.commonDateService.DateTimeFormat(new Date(postData?.assess_date), 'YYYY-MM-DD','YYYY-MM-DD',userTimeZone,1) + '%')
                }
                let weCanHelp = await this.translatorService.frontendReadTranslation(req.lang, `We can help`, `/LC_MESSAGES/MyHealth/Results`, `static`);
                let doingGreat = await this.translatorService.frontendReadTranslation(req.lang, `Doing great`, `/LC_MESSAGES/MyHealth/Results`, `static`);
                let almostThere = await this.translatorService.frontendReadTranslation(req.lang, `Almost there`, `/LC_MESSAGES/MyHealth/Results`, `static`);
                let colorSetUp = { '4': themeSettingsData.progress_hra_high_color, '3': themeSettingsData.progress_hra_mod_color, '2': themeSettingsData.progress_hra_high_color, '1': themeSettingsData.progress_hra_mod_color, '0': themeSettingsData.progress_hra_low_color, '': '#ccc' };
                let colorSetUpMeasure = { '4': '78.33333333333333', '3': '50', '2': '78.33333333333333', '1': '50', '0': '16.66666666666667', '': '0' };
                let svgStatusSetUpMeasure = { '4': 3, '3': 2, '2': 3, '1': 2, '0': 1, '': 0 };
                let riskRating = { '0': doingGreat, '1': almostThere, '2': weCanHelp, '3': almostThere, '4': weCanHelp };
                let colorSetUp2 = { '4': '#ccc', '3': '#ccc', '2': '#ccc', '1': '#ccc', '0': themeSettingsData.progress_hra_low_color, '': '#ccc' };
                let colorSetUpMeasure2 = { '4': '75.66', '3': '50.66', '2': '75.66', '1': '50.66', '0': '16.66', '': '0' };
                let svgStatusSetUpMeasure2 = { '4': 3, '3': 2, '2': 3, '1': 2, '0': 1, '': 0 };
                let riskRating2 = { '0': doingGreat, '1': weCanHelp, '2': weCanHelp, '3': weCanHelp, '4': weCanHelp };
                let colorSetUp5 = { '4': themeSettingsData.progress_very_high_color, '2': themeSettingsData.progress_hra_very_high_color, '3': themeSettingsData.progress_hra_high_color, '1': themeSettingsData.progress_hra_mod_color, '0': themeSettingsData.progress_hra_low_color, '': '#ccc' };
                let colorSetUpMeasure5 = { '4': '90.33333333333333', '3': '50.33333333333333', '2': '70.33333333333333', '1': '30.33', '0': '9.33', '': '0' };
                let svgStatusSetUpMeasure5 = { '4': 3, '3': 3, '2': 3, '1': 2, '0': 1, '': 0 };
                let riskRating5 = { '0': doingGreat, '1': almostThere, '2': weCanHelp, '3': weCanHelp, '4': weCanHelp };
                let emotionalAssessmentData: any = await this.assessmentEmotionalAssessmentService.assessmentListRecord(where, { id: "DESC" });
                let questionScore = {}, tobaccoVaping = {};
                if (emotionalAssessmentData?.['emotional_assessments_results'].length > 0) {
                    for (let emotionalAssessmentsResults of emotionalAssessmentData['emotional_assessments_results']) {
                        for (let emotionalAssessmentsAnswers of emotionalAssessmentsResults['emotional_assessments_answers']) {
                                if (emotionalAssessmentsAnswers?.['assessment_options'] && Object.keys(emotionalAssessmentsAnswers['assessment_options']).length > 0) {
                                    let assessmentQuestion = emotionalAssessmentsAnswers['assessment_options']['assessment_questions'];
                                    let resultType = assessmentQuestion['result_type'];
                                    let riskRating = emotionalAssessmentsAnswers['assessment_options']['risk_rating'];
                                    if (questionScore.hasOwnProperty(resultType) && questionScore[resultType].hasOwnProperty(riskRating)) {
                                        questionScore[resultType][riskRating] += 1;
                                    } else {
                                        questionScore[resultType] ??= {};
                                        questionScore[resultType][riskRating] = 1;
                                    }
                                    if (assessmentQuestion?.['assessment_results'] && Object.keys(assessmentQuestion['assessment_results']).length > 0) {
                                        if (assessmentQuestion['assessment_results']?.['type'] && [1, 2, 3].includes(assessmentQuestion['assessment_results']['type'])) {
                                            if (assessmentQuestion['assessment_results']['type'] == 2) {
                                                if (assessmentQuestion['assessment_results']["marker-common"] != '') {
                                                    tobaccoVaping['tobacco'] ??= {};
                                                    tobaccoVaping['tobacco'][resultType] ??= {};
                                                    let orgId = assessmentQuestion['assessment_results']['organization_id'] ? assessmentQuestion['assessment_results']['organization_id'] : postData?.org_id;
                                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markercommon_${assessmentQuestion['assessment_results']?.organization_id}_${assessmentQuestion['assessment_results']?.id}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${orgId}`,`dynamic`);
                                                    customName = (customName == '' || customName == `assessment_markercommon_${assessmentQuestion['assessment_results']?.organization_id}_${assessmentQuestion['assessment_results']?.id}`) ? assessmentQuestion['assessment_results']["marker-common"] : customName;
                                                    tobaccoVaping['tobacco'][resultType][-1] = customName;
                                                }
                                                if (emotionalAssessmentsAnswers['assessment_options']['message_add'] != '') {
                                                    tobaccoVaping['tobacco'] ??= {};
                                                    tobaccoVaping['tobacco'][resultType] ??= {};
                                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_message_${emotionalAssessmentsAnswers['assessment_options']?.question_id}_${emotionalAssessmentsAnswers['assessment_options']?.id}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${postData?.org_id}`,`dynamic`);
                                                    customName = (customName == '' || customName == `assessment_message_${emotionalAssessmentsAnswers['assessment_options']?.question_id}_${emotionalAssessmentsAnswers['assessment_options']?.id}`) ? emotionalAssessmentsAnswers['assessment_options']['message_add'] : customName;
                                                    tobaccoVaping['tobacco'][resultType][emotionalAssessmentsAnswers['assessment_options']['sort_order']] = customName;
                                                    let start: number;
                                                    if (tobaccoVaping['tobacco'][resultType][1]) {
                                                        start = 2;
                                                    } else if (tobaccoVaping['tobacco'][resultType][2]) {
                                                        start = 3;
                                                    } else if (tobaccoVaping['tobacco'][resultType][3]) {
                                                        start = 4;
                                                    } else if (tobaccoVaping['tobacco'][resultType][4]) {
                                                        start = 5;
                                                    }
                                                    for (let i = start; i <= 5; i++) {
                                                        if (tobaccoVaping['tobacco'][resultType][i]) {
                                                            delete tobaccoVaping['tobacco'][resultType][i];
                                                        }
                                                    }
                                                }
                                                if ([1,2,3].includes(Number(emotionalAssessmentsAnswers['assessment_options']['sort_order'])) && assessmentQuestion['assessment_results']['is_response'] === 1 && assessmentQuestion['assessment_results']["marker-common_last"] != '') {
                                                    tobaccoVaping['tobacco'] ??= {};
                                                    tobaccoVaping['tobacco'][resultType] ??= {};
                                                let orgId = assessmentQuestion['assessment_results']['organization_id'] ? assessmentQuestion['assessment_results']['organization_id'] : postData?.org_id;
                                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markercommon_${assessmentQuestion['assessment_results']?.organization_id}_${assessmentQuestion['assessment_results']?.id}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${orgId}`,`dynamic`);
                                                    customName = (customName == '' || customName == `assessment_markercommon_${assessmentQuestion['assessment_results']?.organization_id}_${assessmentQuestion['assessment_results']?.id}`) ? assessmentQuestion['assessment_results']["marker-common_last"] : customName;
                                                    tobaccoVaping['tobacco'][resultType][100] = customName;
                                                }
                                            } else {
                                                if (emotionalAssessmentsAnswers['assessment_options']['message_add'] != '') {
                                                    tobaccoVaping[resultType] ??= {};
                                                  let orgId = emotionalAssessmentsAnswers['assessment_options']['organization_id'] ? emotionalAssessmentsAnswers['assessment_options']['organization_id'] : postData?.org_id;
                                                  let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_message_${emotionalAssessmentsAnswers['assessment_options']?.question_id}_${emotionalAssessmentsAnswers['assessment_options']?.id}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${orgId}`,`dynamic`);
                                                    customName = (customName == '' || customName == `assessment_message_${emotionalAssessmentsAnswers['assessment_options']?.question_id}_${emotionalAssessmentsAnswers['assessment_options']?.id}`) ? emotionalAssessmentsAnswers['assessment_options']['message_add'] : customName;
                                                    tobaccoVaping[resultType][emotionalAssessmentsAnswers['assessment_options']['sort_order']] = customName;
                                                }
                                            }
                                        }
                                    }
                                }
                        }
                    }
                    for (let questionScoreKey in questionScore) {
                        let questionScoreData = questionScore[questionScoreKey];
                        if (questionScoreData.hasOwnProperty('2')) {
                            questionScore[questionScoreKey] = 2;
                        } else if (questionScoreData.hasOwnProperty('1')) {
                            questionScore[questionScoreKey] = 1;
                        } else if (questionScoreData.hasOwnProperty('3')) {
                            questionScore[questionScoreKey] = 3;
                        } else if (questionScoreData.hasOwnProperty('4')) {
                            questionScore[questionScoreKey] = 4;
                        } else {
                            questionScore[questionScoreKey] = 0;
                        }
                    }
                }
                let ehaAssessmentResults: any = await this.assessmentResultsService.listRecord({ organization_id: postData?.org_id, status: '1' }, ['id', 'organization_id', 'title', 'marker-low', 'marker-mod', 'marker-high', 'type', 'order_id', 'no_of_risk'], { order_id: 'ASC' });
                if(ehaAssessmentResults && ehaAssessmentResults.length){
                    await Promise.all(ehaAssessmentResults.map(async (ele)=>{
                        if(ele.title){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_title_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                            ele.title = (customName == '' || customName == `assessment_title_${ele.organization_id}_${ele['id']}`) ? ele['title'] : customName;
                        }
                        if(ele['marker-low']){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markerlow_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                            ele['marker-low'] = (customName == '' || customName == `assessment_markerlow_${ele.organization_id}_${ele['id']}`) ? ele['marker-low'] : customName;
                        }
                        if(ele['marker-mod']){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markermod_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                            ele['marker-mod'] = (customName == '' || customName == `assessment_markermod_${ele.organization_id}_${ele['id']}`) ? ele['marker-mod'] : customName;
                        }
                        if(ele['marker-high']){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markerhigh_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                            ele['marker-high'] = (customName == '' || customName == `assessment_markerhigh_${ele.organization_id}_${ele['id']}`) ? ele['marker-high'] : customName;
                        }
                        if(ele['marker-common']){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markercommon_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                            ele['marker-common'] = (customName == '' || customName == `assessment_markercommon_${ele.organization_id}_${ele['id']}`) ? ele['marker-common'] : customName;
                        }
                        if(ele['marker-common_last']){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`assessment_markercommonlast_${ele.organization_id}_${ele['id']}`, `/LC_MESSAGES/MyHealth/Assessment/eha/${ele['organization_id']}`,`dynamic`);
                            ele['marker-common_last'] = (customName == '' || customName == `assessment_markercommonlast_${ele.organization_id}_${ele['id']}`) ? ele['marker-common_last'] : customName;
                        }
                    }));
                }
                for (let index = 0; index < ehaAssessmentResults.length; index++) {
                    let labelValue = { '4': ehaAssessmentResults[index]['marker-high'], '3': ehaAssessmentResults[index]['marker-mod'], '2': ehaAssessmentResults[index]['marker-high'], '1': ehaAssessmentResults[index]['marker-mod'], '0': ehaAssessmentResults[index]['marker-low'], '': ehaAssessmentResults[index]['marker-non'] };
                    let arId = ehaAssessmentResults[index]['id'];
                    let arType = ehaAssessmentResults[index]['type'];
                    let arNoOfRisk = ehaAssessmentResults[index]['no_of_risk'];
                    ehaAssessmentResults[index] = { ...ehaAssessmentResults[index], label_title: ehaAssessmentResults[index]['title'], label_value: '', label_color: '', label_name: '', label_status: '', label_check: false, label: [] };
                        if ((Object.keys(tobaccoVaping).length == 0 || !tobaccoVaping[arId]) && ![1,3].includes(arType)) {
                            if (labelValue?.[questionScore?.[arId]] || tobaccoVaping?.['tobacco']?.[arId]) {
                                if (tobaccoVaping?.['tobacco']?.[arId]) {
                                    let assessmentMarkerCommon = tobaccoVaping?.['tobacco']?.[arId]?.['-1'] ?? '';
                                    let assessmentMarkerCommonLast = tobaccoVaping?.['tobacco']?.[arId]?.['100'] ?? '';
                                    let assessmentMessageAdd = tobaccoVaping?.['tobacco']?.[arId]?.['2'] ?? '';
                                    ehaAssessmentResults[index]['label_value'] = [assessmentMarkerCommon, assessmentMarkerCommonLast, assessmentMessageAdd].join('<br><br>');
                                } else {
                                    if (typeof questionScore[arId] !== 'undefined') {
                                        ehaAssessmentResults[index]['label_value'] = labelValue[questionScore[arId]];
                                    }
                                }
                            } else {
                                ehaAssessmentResults[index]['label_value'] = await this.translatorService.frontendReadTranslation(req.lang, 'Not enough info', `/LC_MESSAGES/MyHealth/Results`, `static`);
                            }
                        } else {
                            if (tobaccoVaping[arId]) {
                                ehaAssessmentResults[index]['label_value'] = Object.values(tobaccoVaping[arId]).join('<br>');
                            } else {
                                ehaAssessmentResults[index]['label_value'] = await this.translatorService.frontendReadTranslation(req.lang, 'Not enough info', `/LC_MESSAGES/MyHealth/Results`, `static`);
                            }
                        }
                    ehaAssessmentResults[index]['label_block'] = 0
                    if (typeof questionScore[arId] !== 'undefined') {
                        let colorSetups = {
                            1: { labelName: almostThere, labelStatus: colorSetUpMeasure },
                            2: { labelName: weCanHelp, labelStatus: colorSetUpMeasure2 },
                            0: { labelName: almostThere, labelStatus: colorSetUpMeasure5 },
                        };
                        let labelArray = { 0: riskRating5, 1: riskRating, 2: riskRating2 };
                        let scoreId = questionScore[arId];
                        if (colorSetups[arNoOfRisk] && colorSetups[arNoOfRisk].labelStatus[scoreId] !== '0') {
                            ehaAssessmentResults[index]['label_status'] = colorSetups[arNoOfRisk].labelStatus[scoreId];
                            ehaAssessmentResults[index]['label_name'] = (scoreId === '1') ? colorSetups[arNoOfRisk].labelName : labelArray[arNoOfRisk][scoreId];
                        }
                    }
                    if ((Object.keys(tobaccoVaping).length == 0 || !tobaccoVaping[arId]) && ![1,2,3].includes(arType)) {
                        if ((questionScore?.[arId] && labelValue[questionScore[arId]] && riskRating[questionScore[arId]]) || ![1,2,3].includes(arType)) {
                            let themeSettingsDataDitto = JSON.parse(JSON.stringify(themeSettingsData));
                            if (ehaAssessmentResults[index]['label_status'] == '') {
                                themeSettingsData.progress_hra_low_color = '#F0F0F0';
                                themeSettingsData.progress_hra_mod_color ='#D9D9D9';
                                themeSettingsData.progress_hra_high_color ='#BDBDBD';
                                themeSettingsData.progress_hra_very_high_color = '#969696';
                                themeSettingsData.progress_very_high_color = '#969696';
                            }
                            ehaAssessmentResults[index]['label_block'] = 1;
                            let scoreId = questionScore[arId];
                            if (arNoOfRisk == 1) {
                                let svgStatus = svgStatusSetUpMeasure[scoreId];
                                ehaAssessmentResults[index]['label'] = [
                                    { label: doingGreat, percent: 33.33333333333333, color: themeSettingsData.progress_hra_low_color, svg_status: 0 },
                                    { label: almostThere, percent: 33.33333333333333, color: themeSettingsData.progress_hra_mod_color, svg_status: 0 },
                                    { label: weCanHelp, percent: 33.33333333333333, color: themeSettingsData.progress_hra_high_color, svg_status: 0 },
                                ];
                                ehaAssessmentResults[index]?.label?.[Number(svgStatus) - 1] && (ehaAssessmentResults[index].label[Number(svgStatus) - 1].svg_status = svgStatus);
                            } else if (arNoOfRisk == 2) {
                                let svgStatus = svgStatusSetUpMeasure2[scoreId];
                                ehaAssessmentResults[index]['label'] = [
                                    { label: doingGreat, percent: 33.33333333333333, color: themeSettingsData.progress_hra_low_color, svg_status: 0 },
                                    { label: weCanHelp, percent: 33.33333333333333, color: '#ccc', svg_status: 0 },
                                    { label: weCanHelp, percent: 33.33333333333333, color: '#ccc', svg_status: 0 },
                                ];
                                ehaAssessmentResults[index]?.label?.[Number(svgStatus) - 1] && (ehaAssessmentResults[index].label[Number(svgStatus) - 1].svg_status = svgStatus);
                            } else {
                                let svgStatus = svgStatusSetUpMeasure5[scoreId];
                                ehaAssessmentResults[index]['label'] = [
                                    { label: doingGreat, percent: 20, color: themeSettingsData.progress_hra_low_color, svg_status: 0 },
                                    { label: almostThere, percent: 20, color: themeSettingsData.progress_hra_mod_color, svg_status: 0 },
                                    { label: weCanHelp, percent: 20, color: themeSettingsData.progress_hra_high_color, svg_status: 0 },
                                    { label: weCanHelp, percent: 20, color: themeSettingsData.progress_hra_very_high_color, svg_status: 0 },
                                    { label: weCanHelp, percent: 20, color: themeSettingsData.progress_very_high_color, svg_status: 0 },
                                ];
                                ehaAssessmentResults[index]?.label?.[Number(svgStatus)] && (ehaAssessmentResults[index].label[Number(svgStatus)].svg_status = svgStatus);
                            }
                            themeSettingsData = JSON.parse(JSON.stringify(themeSettingsDataDitto));
                        }
                    }
                    if (arType === 2) {
                        ehaAssessmentResults[index]['label_color'] = '#ccc';
                    } else {
                        const colorMap = { 0: colorSetUp5, 1: colorSetUp, 2: colorSetUp2 };
                        const selectedColorSetUp = colorMap[arNoOfRisk] || colorSetUp5;
                        if ([1, 3].includes(arType)) {
                            ehaAssessmentResults[index]['label_color'] = themeSettingsData.progress_hra_low_color;
                        } else {
                            if (typeof questionScore[arId] !== 'undefined' && typeof tobaccoVaping[arId] === 'undefined') {
                                ehaAssessmentResults[index]['label_color'] = selectedColorSetUp[questionScore[arId]] || '#ccc';
                            } else {
                                ehaAssessmentResults[index]['label_color'] = '#ccc';
                            }
                        }
                    }
                    if ((Object.keys(tobaccoVaping).length === 0 || typeof tobaccoVaping[arId] == 'undefined') && ![1, 2, 3].includes(arType)) {
                        if ((typeof questionScore[arId] !== 'undefined' && typeof colorSetUp[questionScore[arId]] !== 'undefined' && typeof riskRating[questionScore[arId]] !== 'undefined') || ![1, 2, 3].includes(arType)) {
                            ehaAssessmentResults[index]['label_check'] = true;
                        }
                    }
                }
                assessmentResultsData = ehaAssessmentResults;
            }
            let assessmentResults: any = await this.assessmentTextsService.listRecord({ language_id: '1', status: Not(2) }, { id: 'ASC' });
            let assessmentName = [await this.translatorService.frontendReadTranslation(req.lang,'Current Health',`/LC_MESSAGES/MyHealth/Results`, `static`), await this.translatorService.frontendReadTranslation(req.lang,'Prevention',`/LC_MESSAGES/MyHealth/Results`, `static`),await this.translatorService.frontendReadTranslation(req.lang,'Nutrition',`/LC_MESSAGES/MyHealth/Results`, `static`),await this.translatorService.frontendReadTranslation(req.lang,'Exercise',`/LC_MESSAGES/MyHealth/Results`, `static`),await this.translatorService.frontendReadTranslation(req.lang,'Emotion',`/LC_MESSAGES/MyHealth/Results`, `static`)];
            let screeningName = [await this.translatorService.frontendReadTranslation(req.lang,'B M I',`/LC_MESSAGES/MyHealth/Results`,`static`),await this.translatorService.frontendReadTranslation(req.lang,'Blood Pressure Systolic',`/LC_MESSAGES/MyHealth/Results`,`static`),await this.translatorService.frontendReadTranslation(req.lang,'Blood Pressure Diastolic',`/LC_MESSAGES/MyHealth/Results`,`static`),await this.translatorService.frontendReadTranslation(req.lang,'Blood Glucose Non-Fasting',`/LC_MESSAGES/MyHealth/Results`,`static`),await this.translatorService.frontendReadTranslation(req.lang,'A1C levels',`/LC_MESSAGES/MyHealth/Results`,`static`),await this.translatorService.frontendReadTranslation(req.lang,'Total Cholesterol',`/LC_MESSAGES/MyHealth/Results`,`static`),await this.translatorService.frontendReadTranslation(req.lang,'H D L Cholesterol',`/LC_MESSAGES/MyHealth/Results`,`static`),await this.translatorService.frontendReadTranslation(req.lang,'H D L Cholesterol',`/LC_MESSAGES/MyHealth/Results`,`static`),await this.translatorService.frontendReadTranslation(req.lang,'L D L Cholesterol',`/LC_MESSAGES/MyHealth/Results`,`static`),await this.translatorService.frontendReadTranslation(req.lang,'Triglycerides',`/LC_MESSAGES/MyHealth/Results`,`static`)];
            let screeningArray = ['B M I', 'Blood Pressure Systolic', 'Blood Pressure Diastolic', 'Blood Glucose Non-Fasting', 'A1C levels', 'Total Cholesterol', 'H D L Cholesterol Men', 'H D L Cholesterol Women', 'L D L Cholesterol', 'Triglycerides'];
            let fields = ['bmi', 'systolic', 'diastolic', 'blood_glucose', 'alc', 'total_cholesterol', 'hdl', 'hdl', 'ldl', 'triglycerides'];
            let fieldIndex = { 5: 3, 6: 1, 7: 2, 8: 0, 9: 5, 10: 8, 11: 6, 12: 7, 13: 9, 14: 4 };
            let lmspecificmetric = await this.lmspecificmetricsService.listRecord('');
            const resultData: any = {};
            lmspecificmetric.forEach(item => {
                resultData[item.text_id] = item; 
            });
            for (let index = 0; index < assessmentResults.length; index++) {
                if (index <= 4 && postData?.status == '0') {
                    let fieldIndex: number = index + 1;
                    let assessmentResultData = await this.commonService.getAssessmentResult(fieldIndex, field[`field_${fieldIndex}`], themeSettingsData, assessmentResults[index],req.lang,assessmentName[index]);
                    assessmentResultsData.push({ ...assessmentResults[index], ...{ avgval: field[`field_${fieldIndex}`], name: assessmentName[index] }, ...assessmentResultData });
                } else {
                    let newIndex = fieldIndex[index];
                    let fieldVal = fields[newIndex];
                    let avgVal = screeningResults[fieldVal] || 0
                    let screeningResultsStatus = await this.commonService.getScreeningResultStatus(screeningArray[newIndex], avgVal);
                    let screeningResultsValueData = await this.commonService.getScreeningResultData(screeningArray[newIndex], avgVal, themeSettingsData, assessmentResults[index],resultData,req.lang,screeningName[newIndex]);
                    screeningResultsData[newIndex] = { ...assessmentResults[index], ...{ screening_name: screeningArray[newIndex] },...{ name: screeningName[newIndex] }, ...{ [fieldVal]: screeningResults[fieldVal] }, ...screeningResultsStatus, ...screeningResultsValueData };
                }
            }
            assessmentResultsData = assessmentResultsData.map(({ 'marker-low': _, 'marker-mod': __, 'marker-high': ___, ...rest }) => rest);
            screeningResultsData = screeningResultsData.map(({ low_risk, mod_risk, high_risk, very_high_risk, ...rest }) => rest);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { assessment_results: assessmentResultsData, screening_results: screeningResultsData },
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
    @Post('results-date')
    async resultsDate(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const userId = postData?.user_id ?? req.tokenUser?.id;
            let datesArray = [];
            let screeningResults = await this.frontService.biometricsRecord({'bio': `user_id = "${userId}" AND status != "2" AND (height != "" OR weight != "" OR waist != "" OR alc != "" OR systolic != "" OR diastolic != "" OR total_cholesterol != "" OR hdl != "" OR ldl != "" OR triglycerides != "" OR blood_glucose != "")`,'hra_bio': `user_id = "${userId}" AND status != "2" AND (weight != '' OR (height_ft != "" AND height_in != "") OR waist != '' OR alc != '' OR bp_systolic != '' OR bp_diastolic != '' OR total_cholesterol != '' OR hdl != '' OR ldl != '' OR triglycerides != '' OR blood_glucose != '')`},postData,[tableConstant.HEALTH_ASSESSMENT.TBL_HA_HRABIOMETRICS],{created: 'DESC'});
            for(let i = 0; i < screeningResults.length; i++) {
                screeningResults[i].created = await this.commonDateService.DateTimeFormat(new Date(screeningResults[i].created), 'MM-DD-YYYY');
                datesArray.push(await this.commonDateService.DateTimeFormat(new Date(screeningResults[i].created), 'YYYY-MM-DD'));
            }
            let userTimeZone: string = req.tokenUser?.timezone || 'UTC';
            if (postData?.user_id) {
                let getUserTimeZone:UserEntity | null = await this.userService.getOne({id: userId},['timezone'])
                userTimeZone = getUserTimeZone?.timezone || 'UTC';
            }
            if (postData?.status == '1') {
                let resultedData: any = await this.frontService.emotionalAssessmentData(['ea.id AS id','ea.created AS date'],{ hra_status: 100,user_id: userId }, { created: "DESC" },null,'getRawMany');
                for (const data of resultedData) {
                    const date = await this.commonDateService.DateTimeFormat(new Date(data.date), 'utcInputToTz', 'YYYY-MM-DD', userTimeZone, 1);
                    if (!datesArray.includes(date)) {
                        data['created'] = await this.commonDateService.DateTimeFormat(date, 'MM-DD-YYYY','YYYY-MM-DD');
                        data['asses'] = date;
                        delete data.date;
                        screeningResults.push(data);
                    }
                }
            } else {
                let resultedData: any = await this.frontService.assessmentsListRecord({ user_id: userId }, ['id','date'], { date: "DESC" });
                for (const data of resultedData) {
                    const date = await this.commonDateService.DateTimeFormat(new Date(data.date), 'YYYY-MM-DD');
                    if (!datesArray.includes(date)) {
                        data['created'] = new Date(data.date).getTime();
                        data['created'] = await this.commonDateService.DateTimeFormat(data.date, 'MM-DD-YYYY');
                        data['asses'] = date;
                        delete data.date;
                        screeningResults.push(data);
                    }
                }
            }
            screeningResults = this.commonService.dynamicSort(screeningResults, (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: screeningResults,
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
    @Post('hra-list')
    async hraList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let resultData = [{ "id": 1, "title": await this.translatorService.frontendReadTranslation(req.lang, `Current Health`, `/LC_MESSAGES/MyHealth/Results`, `static`), "status": "" }, { "id": 2, "title": await this.translatorService.frontendReadTranslation(req.lang, `Prevention`, `/LC_MESSAGES/MyHealth/Results`, `static`), "status": "" }, { "id": 3, "title": await this.translatorService.frontendReadTranslation(req.lang, `Nutrition`, `/LC_MESSAGES/MyHealth/Results`, `static`), "status": "" }, { "id": 4, "title": await this.translatorService.frontendReadTranslation(req.lang, `Exercise`, `/LC_MESSAGES/MyHealth/Results`, `static`), "status": "" }, { "id": 5, "title": await this.translatorService.frontendReadTranslation(req.lang, `Emotional Health`, `/LC_MESSAGES/MyHealth/Results`, `static`), "status": "" }, { "id": 6, "title": await this.translatorService.frontendReadTranslation(req.lang, `Biometrics`, `/LC_MESSAGES/MyHealth/Results`, `static`), "status": "" }, { "id": 7, "title": await this.translatorService.frontendReadTranslation(req.lang, `Assessment Report`, `/LC_MESSAGES/MyHealth/Results`, `static`), "status": "" }]
            if (req.tokenUser?.role_id == appConstant.ROLE.ADMIN) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultData,
                    message: 'success',
                });
            }
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let biometricStepCheck: any = await this.companySettingsService.findOne({org_id:postData?.org_id},['ha_biomatricstep_hs']);
            let assessmentsData = await this.assessmentsService.findOne({ user_id: postData?.user_id, hra_reset: '0', status: Not(2) }, ['1', '2', '3', '4', '5'], { id: 'DESC' });
            for (let i = 0; i < 5; i++) {
                if (assessmentsData && assessmentsData[i + 1] != '') {
                    resultData[i]['status'] = 'done'
                }
            }
            if (biometricStepCheck?.ha_biomatricstep_hs == '0') {
                resultData = resultData.filter(item => item.title !== "Biometrics");
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultData,
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
    @Post('reset-hra-generate')
    async resetHraGenerate() {
        try {                   
            return await lastValueFrom(this.cronMicroservice.send({ cmd: 'reset-hra-generate' }, {}));                
        } catch (error) {
            throw error;
        }
    }
}