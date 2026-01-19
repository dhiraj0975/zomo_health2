import {
    AssessmentEmotionalAssessmentAnswerDto, AssessmentEmotionalAssessmentAnswerEntity,
    AssessmentEmotionalAssessmentEntity, AssessmentEmotionalAssessmentResultEntity, AssessmentResultsEntity,
    CommonArrayService,
    CommonDateService,
    CommonService,
    tableConstant
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
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateassessmentemotionalassessmentanswerInput, PaginateWithHealthAssessmentInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import {
    AssessmentEmotionalAssessmentService
} from "../assessmentemotionalassessment/assessmentemotionalassessment.service";
import {
    AssessmentEmotionalAssessmentResultService
} from "../assessmentemotionalassessmentresult/assessmentemotionalassessmentresult.service";
import { FrontService } from "../front/front.service";
import { AssessmentEmotionalAssessmentAnswerService } from "./assessmentemotionalassessmentanswer.service";
import {AssessmentResultsService} from "@/modules/healthassessment/assessmentresults/assessmentresults.service";
@Controller('health-assessment/emotional-assessment-answer')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentemotionalassessmentanswerController {
    constructor(
        private readonly assessmentEmotionalAssessmentAnswerService: AssessmentEmotionalAssessmentAnswerService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly assessmentEmotionalAssessmentService: AssessmentEmotionalAssessmentService,
        private readonly assessmentEmotionalAssessmentResultService: AssessmentEmotionalAssessmentResultService,
        private readonly assessmentResultsService: AssessmentResultsService,
        private readonly activityLogService: ActivityLogService,
        private readonly frontService: FrontService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `healthassessment.id !=0 `;
            if(postData?.assessment_id){
                where +=`AND healthassessment.assessment_id = '${postData?.assessment_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'healthassessment.answer');
            }
            const resultedData = await this.assessmentEmotionalAssessmentAnswerService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentEmotionalAssessmentAnswerDto, resultedData['list'], req.lang)
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, status: Not(2) };
            let biometricDetails = await this.assessmentEmotionalAssessmentAnswerService.findOne(where);
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
                await this.commonArrayService.formatToDto(AssessmentEmotionalAssessmentAnswerDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateassessmentemotionalassessmentanswerInput) {
        try {
            if (
                !postData?.assessment_id ||
                !postData?.result_id ||
                !postData?.option_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.assessmentEmotionalAssessmentAnswerService.save(postData);
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
            const where = {id: postData?.id, status: Not(2)};
            const recordDetails = await this.assessmentEmotionalAssessmentAnswerService.findOne(where);
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
            await this.assessmentEmotionalAssessmentAnswerService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {answer:recordDetails}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (postData?.length === 0 || postData == undefined) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const userDetail = postData[0];
            postData?.shift();
            let assessmentId,resultId;
            postData.dob = postData?.dob ?? req.tokenUser?.dob;
            postData.org_id = userDetail.org_id ?? req.tokenUser?.org_id;
            let ageYears = this.commonDateService.calculateUserAge(postData?.dob);
            if (userDetail.user_id && userDetail.tab_id && userDetail.health_a_based_on) {
                let WhereCon: any = {user_id: userDetail.user_id, eha_reset: '0'};
                if (postData?.assessment_id) {
                    WhereCon = {user_id: userDetail.user_id, id: postData?.assessment_id};
                }
                let assessmentData: AssessmentEmotionalAssessmentEntity | null = await this.assessmentEmotionalAssessmentService.getOne(WhereCon,['id','created','hra_status'],{id: 'DESC'});
                assessmentId = assessmentData?.id;
                let tabId = userDetail.tab_id;
                let currentData = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD');
                let created = await this.commonDateService.DateTimeFormat(assessmentData?.created,'YYYY-MM-DD','YYYY-MM-DD HH:mm:ss');
                if (userDetail.health_a_based_on == '0') {
                    if (currentData != created) {
                        assessmentId = null;
                    }
                } else {
                    if (assessmentData && assessmentData?.hra_status >= 100) {
                        if (currentData != created) {
                            assessmentId = null;
                        }
                    }
                }
                const questionIds: number[] = [];
                const questionObj: any = {};
                for (let i: number = 0; i < postData.length; i++) {
                    const item = postData[i];
                    if (item.question_id) {
                        questionIds.push(+item.question_id);
                        questionObj[item.question_id] = item.option_id ?? item.answer ?? 0;
                    }
                }
                let assessmentQuestionsData = await this.frontService.assessmentQuestionsData( ['aq.id','aq.age_considered','aq.age_limit','aq.age_condition','aq.question_type','ao.id','ao.range_type','ao.start_value','ao.risk_rating','ao.end_value'],{id: In(questionIds), status: '1'},{'ao.sort_order': 'DESC'},[{'join_table': 'aq.ao','alias':'ao', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, 'on_condition' : `aq.id = ao.question_id AND ao.status = '1'`, 'join_type': 'inner_many' }],'getMany');
                let answers = [];
                let answerIds = {};
                let resultLevels = [];
                for (let i: number = 0; i < assessmentQuestionsData.length; i++) {
                    let isConsiderable = false;
                    let data = assessmentQuestionsData[i];
                    let answer = questionObj[data['id']];
                    if (data['age_considered'] == '0') {
                        isConsiderable = true;
                    } else {
                        let ageLimit = data['age_limit'];
                        let ageCondition = data['age_condition'];
                        let ageResult = false;
                        switch (ageCondition) {
                            case 1:
                                if (ageYears > ageLimit) {
                                    ageResult = true;
                                }
                                break;
                            case 2:
                                if (ageYears >= ageLimit) {
                                    ageResult = true;
                                }
                                break;
                            case 3:
                                if (ageYears < ageLimit) {
                                    ageResult = true;
                                }
                                break;
                            case 4:
                                if (ageYears <= ageLimit) {
                                    ageResult = true;
                                }
                                break;
                            case 5:
                                if (ageYears == ageLimit) {
                                    ageResult = true;
                                }
                                break;
                        }
                        if (ageResult) {
                            isConsiderable = true;
                        }
                    }
                    if (isConsiderable) {
                        if (data['question_type'] == '4') {
                            answer = (parseInt(answer) < 0) ? 0 : parseInt(answer);
                            if (data['ao'].length > 0) {
                                let tempBlankArray= {};
                                for (let j: number = 0; j < data['ao'].length; j++) {
                                    let optionData = data['ao'][j];
                                    tempBlankArray[optionData['id']] = answer;
                                    switch (optionData['range_type']) {
                                        case 0:
                                            if (answer == optionData['start_value']) {
                                                resultLevels.push(optionData['risk_rating'])
                                                answerIds[optionData['id']] = answer
                                            }
                                            break;
                                        case 1:
                                            if (answer > optionData['start_value']) {
                                                resultLevels.push(optionData['risk_rating'])
                                                answerIds[optionData['id']] = answer
                                            }
                                            break;
                                        case 2:
                                            if (answer >= optionData['start_value']) {
                                                resultLevels.push(optionData['risk_rating'])
                                                answerIds[optionData['id']] = answer
                                            }
                                            break;
                                        case 3:
                                            if (answer < optionData['start_value']) {
                                                resultLevels.push(optionData['risk_rating'])
                                                answerIds[optionData['id']] = answer
                                            }
                                            break;
                                        case 4:
                                            if (answer <= optionData['start_value']) {
                                                resultLevels.push(optionData['risk_rating'])
                                                answerIds[optionData['id']] = answer
                                            }
                                            break;
                                        case 5:
                                            if (answer >= optionData['start_value'] && answer <= optionData['end_value']) {
                                                resultLevels.push(optionData['risk_rating'])
                                                answerIds[optionData['id']] = answer
                                            }
                                            break;
                                    }
                                }
                                if (Object.values(tempBlankArray).filter(value => Object.values(answerIds).includes(value)).length === 0 ) {
                                    answerIds[data['ao'][0]['id']] = answer
                                }
                            }
                        } else {
                            if (Array.isArray(answer)) {
                                if ([1,3].includes(data['question_type'])) {
                                    const result = {};
                                    for (let i: number = 0; i < data['ao'].length; i++) {
                                        const item = data['ao'][i];
                                        result[item.id] = item.parent_id;
                                    }
                                    const filteredKeys = Object.keys(result).filter(key => result[key] && !answer.includes(Number(key)));
                                    answer = answer.filter(id => !filteredKeys.includes(String(id)));
                                    if (answer.length > 0) {
                                        answers = [...answers, ...answer.filter(item => item !== null && item !== undefined && String(item).length > 0)];
                                    }
                                }
                            } else {
                                answers.push(answer);
                            }
                        }
                    }
                }
                if (answers.length > 0) {
                    let assessmentOptionData = await this.frontService.assessmentOptionData( ['ao.id', 'ao.question_id', 'ao.range_type', 'ao.start_value', 'ao.end_value', 'ao.risk_rating', 'ao.type', 'aq.id', 'aq.question_type', 'aq.age_considered', 'aq.age_limit', 'aq.age_condition'],{id: In(answers), status: '1'},null,[{'join_table': 'ao.aq','alias':'aq', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, 'on_condition' : `aq.id = ao.question_id AND aq.status = '1'`, 'join_type': 'inner_one' }],'getMany');
                    let result = {};
                    for (let i: number = 0; i < assessmentOptionData.length; i++) {
                        result[assessmentOptionData[i].id] = assessmentOptionData[i];
                    }
                    for (let i: number = 0; i < answers.length; i++) {
                        let isConsiderable: boolean = false;
                        if (result[answers[i]]['aq']['age_considered'] == '0') {
                            isConsiderable = true;
                        } else {
                            let ageLimit = result[answers[i]]['aq']['age_limit'];
                            let ageCondition = result[answers[i]]['aq']['age_condition'];
                            let ageResult: boolean = false;
                            switch (ageCondition) {
                                case 1:
                                    if (ageYears > ageLimit) {
                                        ageResult = true;
                                    }
                                    break;
                                case 2:
                                    if (ageYears >= ageLimit) {
                                        ageResult = true;
                                    }
                                    break;
                                case 3:
                                    if (ageYears < ageLimit) {
                                        ageResult = true;
                                    }
                                    break;
                                case 4:
                                    if (ageYears <= ageLimit) {
                                        ageResult = true;
                                    }
                                    break;
                                case 5:
                                    if (ageYears == ageLimit) {
                                        ageResult = true;
                                    }
                                    break;
                            }
                            if (ageResult) {
                                isConsiderable = true;
                            }
                        }
                        if (isConsiderable) {
                            if (Object.keys(result[answers[i]]['aq']).length > 0 ) {
                                resultLevels.push(result[answers[i]]['risk_rating'])
                                answerIds[answers[i]] = null;
                            }
                        }
                    }
                }
                let questionsScore= resultLevels.length > 0 ? Math.max(...resultLevels) : null;
                let dataField = {user_id: userDetail.user_id};
                if (userDetail.health_a_based_on == '1') {
                    dataField = {...dataField,...{created: new Date()}}
                }
                if (!assessmentId) {
                    let assessmentAdd = await this.assessmentEmotionalAssessmentService.save({...dataField});
                    assessmentId = assessmentAdd['id']
                } else {
                    await this.assessmentEmotionalAssessmentService.update({id: assessmentId},{...dataField});
                }
                let resultData: AssessmentEmotionalAssessmentResultEntity = await this.assessmentEmotionalAssessmentResultService.findOne({ assessment_id: assessmentId, tab_id: tabId });
                resultId = resultData?.id
                let resultCount: number = await this.assessmentEmotionalAssessmentResultService.getCount({ assessment_id: assessmentId });
                if (!resultData) {
                    let resulSave = await this.assessmentEmotionalAssessmentResultService.save({ assessment_id: assessmentId, tab_id: tabId, questions_score: questionsScore });
                    resultId = resulSave['id']
                    resultCount++
                } else {
                    await this.assessmentEmotionalAssessmentResultService.update({ id: resultId },{questions_score: questionsScore});
                }
                let assessmentResultsListRecord:AssessmentResultsEntity[] = await this.assessmentResultsService.getAll({organization_id: postData?.org_id,status: 1,type: Not(In(['1','3']))}, ['id'],{ id: 'DESC' });
                let tabCount = await this.frontService.assessmentTabsData(['at.id'],`at.organization_id = ${postData?.org_id} AND at.status = '1'`, { 'at.sort_order' : 'ASC' }, [{'join_table': 'at.aq','alias':'aq', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, 'on_condition' : `at.id = aq.tab_id AND aq.status = '1'`, 'join_type': 'inner_many' },{'join_table': 'aq.aqd','alias':'aqd', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS, 'on_condition' : `aq.id = aqd.question_id AND aqd.status = '1'`, 'join_type': 'inner_one' },{'join_table': 'aqd.ao','alias':'ao', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, 'on_condition' : `aqd.question_id = ao.question_id AND ao.status = '1'`, 'join_type': 'inner_many' },{'join_table': 'ao.aod','alias':'aod', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS, 'on_condition' : `ao.id = aod.option_id AND aod.status = '1'`, 'join_type': 'inner_one' }],'getCount');
                let hraStatus: number = Number(((100 / tabCount) * resultCount).toFixed(2));
                if (assessmentResultsListRecord.length > 0) {
                    let assessmentEmotionalAssessmentAnswerData = await this.assessmentEmotionalAssessmentAnswerService.commonQueryBuilder( ['aq.result_type AS result_type'],{assessment_id: assessmentId},null,[{'join_table': 'ao.emotionalAssessmentsAnswer','alias':'ao', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, 'on_condition' : `ao.id = emotionalAssessmentsAnswer.option_id`, 'join_type': 'inner_many' }, {'join_table': 'ao.ao','alias':'aq', 'table' : tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, 'on_condition' : `aq.id = ao.question_id`, 'join_type': 'inner_one' }],'getRawMany',{},'aq.result_type');
                    let completeResultTypeDataList = assessmentEmotionalAssessmentAnswerData.map(item => item.result_type);
                    let orgResultData = assessmentResultsListRecord.map(item => item.id);
                    let firstIntersectResult = completeResultTypeDataList.filter(item => orgResultData.includes(item));
                    if (firstIntersectResult?.length >= orgResultData?.length) {
                        hraStatus = 100;
                    }
                }
                let assessmentUpdate: AssessmentEmotionalAssessmentEntity = await this.assessmentEmotionalAssessmentService.findOne({id: assessmentId});
                await this.assessmentEmotionalAssessmentService.update({id: assessmentId},{hra_status: hraStatus});
                this.activityLogService.create(assessmentUpdate, {hra_status: hraStatus}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS, req.tokenUser?.id);
                let requestedOptions = answerIds;
                let existOptions = [];
                let assessmentAnswerData: AssessmentEmotionalAssessmentAnswerEntity[] = await this.assessmentEmotionalAssessmentAnswerService.listRecord({result_id: resultId, status: Not(2)});
                if (assessmentAnswerData.length > 0) {
                    existOptions = assessmentAnswerData.map(item => item.option_id);
                    const updateBlank = assessmentAnswerData.filter(item => String(item.answer).trim() !== "");
                    if (updateBlank.length > 0) {
                        let bulkUpdateData = []
                        for (let i: number = 0; i < updateBlank.length; i++) {
                            let updateBlankOptValue = updateBlank[i];
                            if((updateBlankOptValue && updateBlankOptValue['option_id'] !== undefined && updateBlankOptValue['option_id'] !== null && requestedOptions?.[updateBlankOptValue['option_id']] !== undefined) && String(requestedOptions?.[updateBlankOptValue?.['option_id']]) !== String(updateBlankOptValue?.['answer'])){
                                bulkUpdateData.push({id: updateBlankOptValue['id'],answer: requestedOptions[updateBlankOptValue['option_id']]})
                            }
                        }
                        await this.assessmentEmotionalAssessmentAnswerService.bulkUpdate('id',bulkUpdateData);
                    }
                }
                const existSet = new Set(existOptions);
                const saveAnswer: any = {};
                for (const key in requestedOptions) {
                    if (!existSet.has(Number(key))) {
                        saveAnswer[key] = requestedOptions[key];
                    }
                }
                const deletable = existOptions.filter(option => !Object.keys(requestedOptions).includes(String(option)));
                if (Object.keys(saveAnswer).length > 0 ) {
                    let assessmentAnswerData = []
                    for (const [key, value] of Object.entries(saveAnswer)) {
                        assessmentAnswerData.push({assessment_id: assessmentId,result_id: resultId,option_id: key,answer: (value=='0') ? 0 : ((value!='') ? value : null)})
                    }
                    await this.assessmentEmotionalAssessmentAnswerService.save(assessmentAnswerData)
                }
                if (deletable.length > 0) {
                    await this.assessmentEmotionalAssessmentAnswerService.update({result_id: resultId,option_id: In(deletable)},{status: 2})
                }
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
            let resultedData = await this.assessmentEmotionalAssessmentAnswerService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentEmotionalAssessmentAnswerDto, resultedData, req.lang)
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
}