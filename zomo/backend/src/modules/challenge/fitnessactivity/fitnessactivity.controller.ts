import { CommonArrayService, FitnessActivityDto, tableConstant } from '@common-constants';
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
    CreateFitnessActivityInput,
    DeleteChallengeInput,
    GetOneChallengeInput,
    UpdateFitnessActivityInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { FitnessActivityService } from './fitnessactivity.service';
@Controller('challenge/fitness-activity')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FitnessActivityController {
    constructor(
        private readonly fitnessActivityService: FitnessActivityService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFitnessActivityInput) {
        try {
            if (!postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let challengeData = await this.fitnessActivityService.save({...postData});
            let dynamicDatas = Object.create(null);
            if(postData?.alphabet){
                let tilte = `fitness_activity_alphabet_${challengeData['challenge_id']}_${challengeData['id']}`;
                dynamicDatas[`${tilte}`]= postData?.alphabet;
            }
            if(postData?.activity_name){
                let tilte = `fitness_activity_name_${challengeData['challenge_id']}_${challengeData['id']}`;
                dynamicDatas[`${tilte}`]= postData?.activity_name;
            }
            if(postData?.suggestion){
                let tilte = `fitness_activity_suggestion_${challengeData['challenge_id']}_${challengeData['id']}`;
                dynamicDatas[`${tilte}`]= postData?.suggestion;
            }
            await this.translatorService.DynamicEngJsonData('Challenge','0',dynamicDatas,'Edit','MyChallenges',challengeData['id']); 
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateFitnessActivityInput) {
        try {
            if (!postData?.id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.fitnessActivityService.findOne({
                id: postData?.id,challenge_id: postData?.challenge_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.fitnessActivityService.update({ id: postData?.id, challenge_id: postData?.challenge_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_FITNESS_ACTIVITY, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.alphabet){
                let tilte = `fitness_activity_alphabet_${recordDetails['challenge_id']}_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`]= postData?.alphabet;
            }
            if(postData?.activity_name){
                let tilte = `fitness_activity_name_${recordDetails['challenge_id']}_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`]= postData?.activity_name;
            }
            if(postData?.suggestion){
                let tilte = `fitness_activity_suggestion_${recordDetails['challenge_id']}_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`]= postData?.suggestion;
            }
            await this.translatorService.DynamicEngJsonData('Challenge','0',dynamicDatas,'Edit','MyChallenges',recordDetails['id']); 
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
            if (!postData?.id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.fitnessActivityService.findOne({
                id: postData?.id,challenge_id: postData?.challenge_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.fitnessActivityService.update({id: postData?.id, challenge_id: postData?.challenge_id},{status: 2});
            this.activityLogService.create(recordDetails, {suggestion: recordDetails}, tableConstant.CHALLENGE.TBL_CH_FITNESS_ACTIVITY, req.tokenUser?.id, 'delete');
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
            if (!postData?.id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.fitnessActivityService.findOne({id: postData?.id, challenge_id: postData?.challenge_id, status: 1});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(FitnessActivityDto, resultedData, req.lang)
            );
            if(resultedData){
                let customName;
                    if(resultedData.alphabet){
                        customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_activity_alphabet_${resultedData['challenge_id']}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData.id}`,`dynamic`);
                        resultedData.alphabet = !customName.includes('fitness_activity_alphabet_') ? customName : resultedData.alphabet;
                    }
                    if(resultedData.activity_name){
                        customName = await this.translatorService.frontendReadTranslation(req.lang, `fitness_activity_name_${resultedData['challenge_id']}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData.id}`,`dynamic`);
                        resultedData.activity_name = !customName.includes('fitness_activity_name_') ? customName : resultedData.activity_name;
                    }
                    if(resultedData.suggestion){
                        customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_activity_suggestion_${resultedData['challenge_id']}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData.id}`,`dynamic`);
                        resultedData.suggestion = !customName.includes('fitness_activity_suggestion_') ? customName : resultedData.suggestion;
                    }
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