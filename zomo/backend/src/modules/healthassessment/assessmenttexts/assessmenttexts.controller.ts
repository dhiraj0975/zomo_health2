import { appConstant, AssessmentTextsDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateAssessmentTextsInput,
    PaginateWithHealthAssessmentInput,
} from '../../../input';
import { TranslationService } from '../../translation/translation.service';
import { AssessmentTextsService } from './assessmenttexts.service';
@Controller('health-assessment/texts')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class AssessmentTextsController {
    constructor(
        private readonly assessmentTextsService: AssessmentTextsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: PaginateWithHealthAssessmentInput,
    ) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ` `;
            if(postData?.sec_ids && postData?.sec_ids != ''){
                where += `healthassessment.ass_sec_id IN(${postData?.sec_ids.split(',')}) AND healthassessment.status !=2 `
            }
            if (postData?.search_str) {
                const conditionString = `healthassessment.low_risk LIKE '%${postData?.search_str}%' OR healthassessment.mod_risk LIKE '%${postData?.search_str}%' OR healthassessment.high_risk LIKE '%${postData?.search_str}%' OR healthassessment.very_high_risk LIKE '%${postData?.search_str}%'`;
                where += postData?.sec_ids && postData?.sec_ids != '' ? conditionString : ('AND(' + conditionString + ')');
            }
            const resultedData = await this.assessmentTextsService.paginateList(
                where,
                postData,
                req,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(
                    AssessmentTextsDto,
                    resultedData['list'],
                    req.lang
                )
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
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = { id: postData?.id, status: Not(2) };
            let biometricDetails =
                await this.assessmentTextsService.findOne(where);
            if (!biometricDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(
                    AssessmentTextsDto,
                    biometricDetails,
                    req.lang
                )
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
    async create(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateAssessmentTextsInput[],
    ) {
        try {
            if (
                !postData["text"]
            ) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const filteredData = postData["text"];
            if (filteredData?.length) {
                let path: string = '';
                let dynamicData = Object.create(null);
                for (let i: number = 0; i < filteredData.length; i++) {
                    let data = filteredData[i]
                    let index: number = data['ass_sec_id'] - 1;
                    path = appConstant.HRA_ASSESSMENT_BIOMETRIC_TEXT[index].path
                    if(data?.low_risk){
                        let title: string = `${appConstant.HRA_ASSESSMENT_BIOMETRIC_TEXT[index].low_risk}${data?.ass_sec_id}`
                        dynamicData[`${title}`] = data?.low_risk;
                    }
                    if(data?.mod_risk){
                        let title: string = `${appConstant.HRA_ASSESSMENT_BIOMETRIC_TEXT[index].mod_risk}${data?.ass_sec_id}`
                        dynamicData[`${title}`] = data?.mod_risk;
                    }
                    if(data?.high_risk){
                        let title: string = `${appConstant.HRA_ASSESSMENT_BIOMETRIC_TEXT[index].high_risk}${data?.ass_sec_id}`
                        dynamicData[`${title}`] = data?.high_risk;
                    }
                    if(data?.very_high_risk){
                        let title: string = `${appConstant.HRA_ASSESSMENT_BIOMETRIC_TEXT[index].very_high_risk}${data?.ass_sec_id}`
                        dynamicData[`${title}`] = data?.very_high_risk;
                    }
                    if(data?.learn_more){
                        let title: string = `${appConstant.HRA_ASSESSMENT_BIOMETRIC_TEXT[index].learn_more}${data?.ass_sec_id}`
                        dynamicData[`${title}`] = data?.learn_more;
                    }
                    await this.assessmentTextsService.update({ass_sec_id: data.ass_sec_id},data);
                }
                await this.translatorService.DynamicEngJsonData('MyHealth',null,dynamicData,'Add','Assessment/hra',`${path}`);
            }
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
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = { id: postData?.id, status: Not(2) };
            const recordDetails =
                await this.assessmentTextsService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            await this.assessmentTextsService.update(where,{ status: 2 });
            this.activityLogService.create(recordDetails, {learn_more:recordDetails}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TEXTS, req.tokenUser?.id, 'delete');
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
    async update(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateAssessmentTextsInput,
    ) {
        try {
            if (!postData?.id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = { id: postData?.id, status: Not(2) };
            const recordDetails =
                await this.assessmentTextsService.findOne(where);
            if (!recordDetails) {
                await this.assessmentTextsService.save({
                    ...postData,
                    created_by: req.tokenUser?.id,
                });
            }
            await this.assessmentTextsService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TEXTS, req.tokenUser?.id);
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
            let resultedData =
                await this.assessmentTextsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(AssessmentTextsDto, resultedData, req.lang)
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
