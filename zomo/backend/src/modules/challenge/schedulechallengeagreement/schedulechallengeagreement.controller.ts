import { CommonArrayService, ScheduleChallengeAgreementDto, tableConstant } from '@common-constants';
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
    CreateScheduleChallengeAgreementInput,
    DeleteChallengeInput,
    GetOneChallengeInput,
    UpdateScheduleChallengeAgreementInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ScheduleChallengeService } from '../schedulechallenge/schedulechallenge.service';
import { ScheduleChallengeAgreementService } from './schedulechallengeagreement.service';
@Controller('challenge/schedule-challenge-agreement')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ScheduleChallengeAgreementController {
    constructor(
        private readonly scheduleChallengeAgreementService: ScheduleChallengeAgreementService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateScheduleChallengeAgreementInput) {
        try {
            if (!postData?.schedule_id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let recordDetails = await this.scheduleChallengeAgreementService.save({...postData});
            let dynamicDatas = Object.create(null);
            let scheduleChallenge = await this.scheduleChallengeService.challengeFindOne(['sc'],{id: postData?.schedule_id });
            if(postData?.agreement_text){
                let tilte = `agreement_name_${postData['schedule_id']}`
                dynamicDatas[`${tilte}`]= postData?.agreement_text;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',scheduleChallenge?.org_id,dynamicDatas,'Edit','MyChallenges',postData['schedule_id']);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Challenge aggreement successfully added.')
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateScheduleChallengeAgreementInput) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.scheduleChallengeAgreementService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.scheduleChallengeAgreementService.update({ id: postData?.id, schedule_id: postData?.schedule_id},{...postData});
            let dynamicDatas = Object.create(null);
            if(postData?.agreement_text){
                let tilte = `agreement_name_${postData['schedule_id']}`
                dynamicDatas[`${tilte}`]= postData?.agreement_text;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',recordDetails['scheduleChallenge'].org_id,dynamicDatas,'Edit','MyChallenges',postData['schedule_id']);
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_AGREEMENT, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'Challenge aggreement successfully edited.')
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
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.scheduleChallengeAgreementService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.scheduleChallengeAgreementService.update({id: postData?.id, schedule_id: postData?.schedule_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_AGREEMENT, req.tokenUser?.id,'delete');
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneChallengeInput) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.scheduleChallengeAgreementService.findOne({id: postData?.id, schedule_id: postData?.schedule_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ScheduleChallengeAgreementDto, resultedData, req.lang)
            );
            if(resultedData.agreement_text){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`agreement_name_${resultedData['schedule_id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${resultedData['scheduleChallenge'].org_id}/${resultedData.schedule_id}`,`dynamic`);
                resultedData.agreement_text = (customName == '' || customName == `agreement_name_${resultedData['schedule_id']}`) ? resultedData['agreement_text'] : customName;
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
}