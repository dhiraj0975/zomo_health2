import { BioWeightDto, CommonArrayService, CommonDateService, tableConstant } from '@common-constants';
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
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateBioWeightInput,
    DeleteChallengeInput,
    GetOneChallengeInput,
    UpdateBioWeightInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { BioWeightService } from './bioweight.service';
const moment = require('moment-timezone');
@Controller('challenge/bio-weight')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class BioWeightController {
    constructor(
        private readonly bioWeightService: BioWeightService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateBioWeightInput) {
        try {
            if (!postData?.user_id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let current_date = this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
            postData['added_date'] = this.commonDateService.getTodayDate(postData['added_date']).format('YYYY-MM-DD HH:mm:ss') ?? this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');
            const challengeDetails = await this.scheduleChallengeService.findOne({
                id: postData?.schedule_id
            });
            let message
            let errorMsgTrans
            if(challengeDetails && challengeDetails.weight_insert_date == 1){
                let rangestartdate = challengeDetails.rangestartdate;  
                let rangeenddate = challengeDetails.rangeenddate;     
                let s_rangestartdate = challengeDetails.s_rangestartdate; 
                let s_rangeenddate = challengeDetails.s_rangeenddate;    
                let comparedate = postData['added_date'];  
                let rangeStartDateMoment = moment(rangestartdate, 'YYYY-MM-DD');
                let rangeEndDateMoment = moment(rangeenddate, 'YYYY-MM-DD');
                let sRangeStartDateMoment = moment(s_rangestartdate, 'YYYY-MM-DD');
                let sRangeEndDateMoment = moment(s_rangeenddate, 'YYYY-MM-DD');
                let compareDateMoment = moment(comparedate, 'YYYY-MM-DD');
                if (!rangestartdate || !rangeenddate) {
                    message = await this.translatorService.frontendReadTranslation(req.lang,'Your weight has been successfully logged', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                } else {
                    let startMonthName = await this.commonDateService.DateTimeFormat(sRangeStartDateMoment, 'MMMM');
                    if(sRangeStartDateMoment){
                        startMonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(sRangeStartDateMoment, 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                    }
                    let endMonthName = await this.commonDateService.DateTimeFormat(sRangeEndDateMoment, 'MMMM');
                    if(sRangeEndDateMoment){
                        endMonthName = await this.translatorService.frontendReadTranslation(req.lang, this.commonDateService.DateTimeFormat(sRangeEndDateMoment, 'MMM')?.toString(), `/LC_MESSAGES/Common/Month`,`static`);
                    }
                    if (!s_rangestartdate || !s_rangeenddate) {
                        if (compareDateMoment.isBetween(rangeStartDateMoment, rangeEndDateMoment, null, '[]')) {
                            message = await this.translatorService.frontendReadTranslation(req.lang,'Your weight has been successfully logged', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        } else {
                            const andTrans = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                'and',
                                '/LC_MESSAGES/Challenge/MyChallenges',
                                'static'
                            );
                            errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,'The next date range for the data log is between', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            errorMsgTrans += ` ${startMonthName} ${this.commonDateService.DateTimeFormat(sRangeStartDateMoment, 'D')}, ${this.commonDateService.DateTimeFormat(sRangeStartDateMoment, 'YYYY')}, ${andTrans} ${endMonthName} ${this.commonDateService.DateTimeFormat(sRangeEndDateMoment, 'D')}, ${this.commonDateService.DateTimeFormat(sRangeEndDateMoment, 'YYYY')}`;
                            throw new Error(errorMsgTrans);
                        }
                    } else {
                        if (
                            compareDateMoment.isBetween(rangeStartDateMoment, rangeEndDateMoment, null, '[]') || 
                            compareDateMoment.isBetween(sRangeStartDateMoment, sRangeEndDateMoment, null, '[]')
                        ) {
                            message = await this.translatorService.frontendReadTranslation(req.lang,'Your weight has been successfully logged', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                        } else {
                            const andTrans = await this.translatorService.frontendReadTranslation(
                                req.lang,
                                'and',
                                '/LC_MESSAGES/Challenge/MyChallenges',
                                'static'
                            );
                            errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,'The next date range for the data log is between', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                            errorMsgTrans += ` ${startMonthName} ${this.commonDateService.DateTimeFormat(sRangeStartDateMoment, 'D')}, ${this.commonDateService.DateTimeFormat(sRangeStartDateMoment, 'YYYY')}, ${andTrans} ${endMonthName} ${this.commonDateService.DateTimeFormat(sRangeEndDateMoment, 'D')}, ${this.commonDateService.DateTimeFormat(sRangeEndDateMoment, 'YYYY')}`;
                            throw new Error(errorMsgTrans);
                        }
                    }
                }
            }
            else{
                let startDateMoment = moment(challengeDetails.start_date);
                if (startDateMoment.isSameOrBefore(current_date)) {
                    message = await this.translatorService.frontendReadTranslation(req.lang,'Your weight has been successfully logged', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                } else {
                    errorMsgTrans = await this.translatorService.frontendReadTranslation(req.lang,'You Can Only Enter Data After The Challenge Has Started', `/LC_MESSAGES/Challenge/MyChallenges`,`static`);
                    throw new Error(errorMsgTrans);
                }
            }
            if(errorMsgTrans){
                return res.status(HttpStatus.OK).json({
                                    statusCode: 200,
                                    success: 1,
                                    error: 0,
                                    data: [],
                                    message: errorMsgTrans,
                                });
            }
            await this.bioWeightService.save({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: message
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateBioWeightInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.bioWeightService.findOne({
                id: postData?.id,user_id: postData?.user_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.bioWeightService.update({ id: postData?.id, user_id: postData?.user_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_BIO_WEIGHT, req.tokenUser?.id);
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.bioWeightService.findOne({
                id: postData?.id, user_id: postData?.user_id, schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.bioWeightService.update({id: postData?.id, user_id: postData?.user_id},{status:2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_BIO_WEIGHT, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Your weight has been successfully deleted', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneChallengeInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.bioWeightService.findOne({id: postData?.id, user_id: postData?.user_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(BioWeightDto, resultedData, req.lang)
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user_id = postData?.user_id ?? req.tokenUser?.id;
            if (!postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where =  `weight.user_id = '${user_id}' AND weight.schedule_id = ${postData?.schedule_id} AND weight.status != 2`;
            if(postData?.schedule_join_id){
                where += ` AND weight.schedule_join_id = '${postData?.schedule_join_id}'`;
            }
            if(postData['collect_date']){
                where += ` AND(weight.added_date Between '${this.commonDateService.getTodayDate(postData['collect_date']['start_date']).format('YYYY-MM-DD') +' 00:00:00'}' AND '${this.commonDateService.getTodayDate(postData['collect_date']['end_date']).format('YYYY-MM-DD') + ' 23:59:59'}')`;
            }
            let resultedData = await this.bioWeightService.listRecord(where,{added_date: 'DESC'});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(BioWeightDto, resultedData, req.lang)
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