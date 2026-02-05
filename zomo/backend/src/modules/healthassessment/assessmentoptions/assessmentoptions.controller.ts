import {
    appConstant,
    AssessmentOptionsDetailsDto,
    AssessmentOptionsDto,
    CommonArrayService,
    CommonFileService,
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
import { CreateAssessmentOptionsInput, PaginateWithHealthAssessmentInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { AssessmentOptionsDetailsService } from "../assessmentoptionsdetails/assessmentoptionsdetails.service";
import { AssessmentOptionsService } from "./assessmentoptions.service";
@Controller('health-assessment/assessment-options')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentOptionsController {
    constructor(
        private readonly assessmentOptionsService: AssessmentOptionsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly assessmentOptionsDetailsService: AssessmentOptionsDetailsService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithHealthAssessmentInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `ao.status != '2' `;
            if(postData?.question_id){
                where +=` AND ao.question_id = '${postData?.question_id}'`;
            }
            if (postData?.search_str) {
                let riskRatingId = Object.keys(appConstant.OPTION_LEVEL).filter(key => appConstant.OPTION_LEVEL[key].toLowerCase().includes(postData?.search_str.toLowerCase()));
                let levelCon = ``;
                if (riskRatingId.length > 0){
                    levelCon = ` OR ao.risk_rating IN(${riskRatingId.join(",")})`;
                }
                where += ` AND ((aod.option_title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' ${levelCon} OR ao.sort_order = '${postData?.search_str}') `;
                const generateWhereCondition = (searchString) => {
                    searchString = searchString.toLowerCase();
                    let whereClause = '';
                    const numbers = searchString.match(/\d+/g)?.map(Number) || [];
                    let startValue = numbers[0], endValue;
                    let rangeTypeOptions = appConstant.RANGE_TYPE_OPTIONS;
                    if (searchString.includes(rangeTypeOptions[0].toLowerCase())) {
                        whereClause += ` OR (aq.question_type = 4 AND ao.range_type = '0' AND ao.start_value = ${startValue})`;
                    }
                    if (searchString.includes(rangeTypeOptions[1].toLowerCase())) {
                        whereClause += ` OR (aq.question_type = 4 AND ao.range_type = '1' AND ao.start_value = ${startValue})`;
                    }
                    if (searchString.includes(rangeTypeOptions[2].toLowerCase())) {
                        whereClause += ` OR (aq.question_type = 4 AND ao.range_type = '2' AND ao.start_value = ${startValue})`;
                    }
                    if (searchString.includes(rangeTypeOptions[3].toLowerCase())) {
                        whereClause += ` OR (aq.question_type = 4 AND ao.range_type = '3' AND ao.start_value = ${startValue})`;
                    }
                    if (searchString.includes(rangeTypeOptions[4].toLowerCase())) {
                        whereClause += ` OR (aq.question_type = 4 AND ao.range_type = '4' AND ao.start_value = ${startValue})`;
                    }
                    if (searchString.startsWith(rangeTypeOptions[5].toLowerCase()) && numbers.length === 1) {
                        whereClause += ` OR (aq.question_type = 4 AND ao.range_type = '5' AND ao.start_value = ${startValue})`;
                    }
                    if ((searchString.includes('range between') || searchString.includes('and')) && numbers.length === 2) {
                        endValue = numbers[1];
                        whereClause += ` OR (aq.question_type = 4 AND ao.range_type = '5' AND ao.start_value = ${startValue} AND ao.end_value = ${endValue})`;
                    }
                    return `${whereClause})`
                };
                where += generateWhereCondition(postData?.search_str);
            }
            const resultedData = await this.assessmentOptionsService.paginateList(
                ["ao.id","ao.sort_order","ao.status","ao.risk_rating","ao.start_value","ao.range_type","ao.end_value","aod.option_title","aq.question_type"],
                where,
                postData,
            );
            for (let i = 0; i < resultedData['list'].length; i++) {
                let data = resultedData['list'][i];
                if (data?.aq?.question_type == '4') {
                    data.aod = data?.aod || {}
                    if (data?.range_type == '5') {
                        data.aod.option_title = `Range Between ${data?.start_value} and ${data?.end_value}`;
                    } else {
                        data.aod.option_title = `${appConstant.RANGE_TYPE_OPTIONS[data?.range_type]} ${data?.start_value}`;
                    }
                }
                resultedData['list'][i] = data;
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(AssessmentOptionsDto, resultedData['list'], req.lang)
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
            const where = { id: postData?.id };
            let biometricDetails = await this.assessmentOptionsService.findOne(where,["ao.id","ao.question_id","ao.parent_id","ao.sort_order","ao.range_type","ao.start_value","ao.end_value","ao.status","ao.risk_rating","ao.type","ao.message_add","aod.id","aod.option_title"],{id: "DESC"},[tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS]);
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
            if (biometricDetails?.parent_id) {
                let optionDetails = await this.assessmentOptionsDetailsService.findOne({status: Not('2'),id: biometricDetails?.parent_id});
                if (optionDetails) {
                    biometricDetails.parent_option = optionDetails
                }
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(AssessmentOptionsDto, biometricDetails, req.lang)
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateAssessmentOptionsInput) {
        try {
            if (!postData?.question_id || !this.commonService.isValidNumber(postData?.risk_rating)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let optionTitle = postData?.option_title;
            delete postData?.option_title;
            let mainOptionId = postData?.main_option_id || 0;
            delete postData?.main_option_id;
            let languageId = postData?.language_id || 1;
            delete postData?.language_id;
            let resultData = await this.assessmentOptionsService.findOne({question_id: postData?.question_id, status: Not(2)},["ao.id","ao.sort_order"],{sort_order:"DESC"});
            postData['sort_order'] = resultData && resultData['sort_order'] ? resultData['sort_order'] + 1 : 1;
            let lastId = await this.assessmentOptionsService.save({...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
            if (!lastId) {
                return true;
            }
            if (optionTitle) {
                let dynamicData = Object.create(null);
                let title = `assessment_option_title_${postData?.question_id}_${lastId['id']}`
                dynamicData[`${title}`] = optionTitle;
                await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicData,'Edit','Assessment',req.tokenUser?.org_id);
            }
            await this.assessmentOptionsDetailsService.save({option_id: lastId['id'],option_title: optionTitle, main_option_id: mainOptionId, language_id: languageId});
            if (postData?.message_add) {
                let dynamicData = Object.create(null);
                let title = `assessment_message_${postData?.question_id}_${lastId['id']}`
                dynamicData[`${title}`] = postData.message_add;
                await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicData,'Edit','Assessment',req.tokenUser?.org_id);
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_OPTION_ADDED'),
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
            const recordDetails = await this.assessmentOptionsService.findOne(where,['ao.id','ao.question_id']);
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
            await this.assessmentOptionsService.update(where,{status:2});
            if (recordDetails) {
                if (recordDetails.question_id) {
                    let optionKey: string = `assessment_option_title_${recordDetails.question_id}_${recordDetails.id}`
                    let messageKey: string = `assessment_message_${recordDetails.question_id}_${recordDetails.id}`
                    const dynamicData: Record<string, string> = {
                        [optionKey]: optionKey,
                        [messageKey]: messageKey,
                    };
                    await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicData,'Delete','Assessment',req.tokenUser?.org_id);
                }
                let optionId = recordDetails['question_id'];
                let optionDetailData = await this.assessmentOptionsDetailsService.listRecord({option_id: optionId});
                await this.assessmentOptionsDetailsService.update({option_id: optionId}, {status:2});
                this.activityLogService.create(optionDetailData, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS, req.tokenUser?.id,'delete');
            }
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_OPTION_DELETED'),
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let message;
            const where = {id: postData?.id};
            const recordDetails = await this.assessmentOptionsService.findOne(where,['ao.id','ao.question_id']);
            if (!recordDetails) {
                await this.assessmentOptionsService.save({...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id});
            }
            if (postData?.option_title) {
                let optionDetailData = await this.assessmentOptionsDetailsService.findOne({option_id: postData?.id});
                let mainOptionId = postData?.main_option_id || 0;
                let languageId = postData?.language_id || 1;
                await this.assessmentOptionsDetailsService.update({option_id: postData?.id}, {option_title: postData?.option_title,language_id: languageId, main_option_id: mainOptionId});
                await this.activityLogService.create(optionDetailData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS, req.tokenUser?.id);
                let dynamicData = Object.create(null);
                let title = `assessment_option_title_${postData?.question_id}_${postData?.id}`
                dynamicData[`${title}`] = postData?.option_title;
                await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicData,'Edit','Assessment',req.tokenUser?.org_id);
                delete postData?.option_title;
                delete postData?.main_option_id;
                delete postData?.language_id;
            }
            if (postData?.message_add) {
                let dynamicData = Object.create(null);
                let title = `assessment_message_${postData?.question_id}_${postData?.id}`
                dynamicData[`${title}`] = postData.message_add;
                await this.translatorService.DynamicEngJsonData('MyHealth','eha',dynamicData,'Edit','Assessment',req.tokenUser?.org_id);
            }
            await this.assessmentOptionsService.update(where, {...postData, updated_by : req.tokenUser?.id});
            message = await this.translatorService.frontendReadTranslation(req.lang, 'MSG_OPTION_UPDATED');
            if ([0, 1].includes(postData?.status)) {
                let statusMessage = {'0': 'MSG_OPTION_DEACTIVATE','1': 'MSG_OPTION_ACTIVATE'}
                message = await this.translatorService.frontendReadTranslation(req.lang, statusMessage[postData?.status]);
            }
            await this.activityLogService.create(recordDetails, {...postData, updated_by : req.tokenUser?.id}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, req.tokenUser?.id);
            if ([0,1].includes(postData?.status)) {
                let optionId = recordDetails['question_id'];
                let optionDetailData = await this.assessmentOptionsDetailsService.listRecord({option_id: optionId});
                await this.assessmentOptionsDetailsService.update({option_id: optionId}, {status: postData?.status});
                this.activityLogService.create(optionDetailData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS, req.tokenUser?.id);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: message,
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
            let where = ``;
            if (postData?.question_id) {
                where += `ao.status IN('0','1') AND ao.question_id = ${postData?.question_id} AND aod.status != '2' AND aod.main_option_id = '0' AND (ao.parent_id IS NULL OR ao.parent_id = '0')`
            }
            let resultedData = await this.assessmentOptionsService.listRecord(where,{sort_order: 'ASC'},['aod.id AS id','aod.option_id AS option_id','aod.option_title AS option_title'],[tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS]);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentOptionsDetailsDto, resultedData, req.lang)
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
    @Post('change-order')
    async changeOrder(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            /* TODO sort_order to order_id key change in db when db structure change */
            if (postData?.order.length == 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.assessmentOptionsService.listRecord({ id: In(postData?.order)}, { sort_order: 'ASC' },["id","sort_order"]);
            const orderArray = postData?.order;
            let answers = resultedData.map(obj => obj.sort_order);
            for (let i = 0; i < orderArray.length; i++) {
                await this.assessmentOptionsService.update({id: orderArray[i]},{sort_order:answers[i]});
            }
            this.activityLogService.create(resultedData, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS, req.tokenUser?.id);
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}