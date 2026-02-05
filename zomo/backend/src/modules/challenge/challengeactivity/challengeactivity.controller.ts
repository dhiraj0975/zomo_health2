import { appConstant, ChallengeActivityDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
    CreateChallengeActivityInput,
    DeleteChallengeInput,
    GetOneChallengeInput,
    PaginateWithChallengeInput,
    UpdateChallengeActivityInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { ChallengeActivityService } from './challengeactivity.service';
@Controller('challenge/challenge-activity')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ChallengeActivityController {
    constructor(
        private readonly challengeActivityService: ChallengeActivityService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `challenge.status != 2` : `challenge.status = 1`;       
            if (postData?.search_str) {
                if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                    where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['challenge.activity_name']);
                }else{
                    where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['challenge.activity_name','challenge.activity_desc']);
                }
            }
            let resultedData = await this.challengeActivityService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ChallengeActivityDto, resultedData['list'], req.lang)
            );
            if(![appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)){
                await Promise.all(resultedData['list'].map(async (ele) => {
                    if(ele.activity_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${ele['id']}`, `/LC_MESSAGES/Challenge/Activity/${ele.id}`,`dynamic`);
                        ele.activity_name = (customName == '' || customName == `activity_name_${ele['id']}`) ? ele['activity_name'] : customName;
                    }
                    if(ele.activity_desc){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`activity_desc_${ele['id']}`, `/LC_MESSAGES/Challenge/Activity/${ele.id}`,`dynamic`);
                        ele.activity_desc = (customName == '' || customName == `activity_desc_${ele['id']}`) ? ele['activity_desc'] : customName;
                    }
                }));
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateChallengeActivityInput) {
        try {
            if (!postData?.activity_name || !postData?.activity_desc) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let savedData = await this.challengeActivityService.save({...postData});
            let dynamicData = Object.create(null);
            if(postData?.activity_name){
                let title = `activity_name_${savedData['id']}`
                dynamicData[`${title}`]= postData?.activity_name;
            }            
            if(postData?.activity_desc){
                let title = `activity_desc_${savedData['id']}`
                dynamicData[`${title}`]= postData?.activity_desc;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',savedData['id'],dynamicData,'Edit','Activity');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateChallengeActivityInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.challengeActivityService.findOne({
                id: postData?.id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.challengeActivityService.update({ id: postData?.id},{...postData});
            let dynamicData = Object.create(null);
            if(postData?.activity_name){
                let title = `activity_name_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.activity_name;
            }            
            if(postData?.activity_desc){
                let title = `activity_desc_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.activity_desc;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',recordDetails['id'],dynamicData,'Edit','Activity');
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_CHALLENGE_ACTIVITY, req.tokenUser?.id);
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.challengeActivityService.findOne({
                id: postData?.id, activity_name: postData?.activity_name
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.challengeActivityService.update({id: postData?.id}, {status: 2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_CHALLENGE_ACTIVITY, req.tokenUser?.id, 'delete');
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.challengeActivityService.findOne({id: postData?.id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ChallengeActivityDto, resultedData, req.lang)
            );
            if(resultedData.activity_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${resultedData['id']}`, `/LC_MESSAGES/Challenge/Activity/${resultedData.id}`,`dynamic`);
                resultedData.activity_name = (customName == '' || customName == `activity_name_${resultedData['id']}`) ? resultedData['activity_name'] : customName;
            }
            if(resultedData.activity_desc){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`activity_desc_${resultedData['id']}`, `/LC_MESSAGES/Challenge/Activity/${resultedData.id}`,`dynamic`);
                resultedData.activity_desc = (customName == '' || customName == `activity_desc_${resultedData['id']}`) ? resultedData['activity_desc'] : customName;
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let where: any = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? {status: Not(2)} : {status: 1};    
            let result = await this.challengeActivityService.listRecord(where,{ id: 'ASC' });
            result = <any>(
                await this.commonArrayService.formatToDto(ChallengeActivityDto, result, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                await Promise.all(result.map(async (ele) => {
                    if (ele.activity_name) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `activity_name_${ele['id']}`, `/LC_MESSAGES/Challenge/Activity/${ele.id}`, `dynamic`);
                        ele.activity_name = (customName == '' || customName == `activity_name_${ele['id']}`) ? ele['activity_name'] : customName;
                    }
                    if (ele.activity_desc) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `activity_desc_${ele['id']}`, `/LC_MESSAGES/Challenge/Activity/${ele.id}`, `dynamic`);
                        ele.activity_desc = (customName == '' || customName == `activity_desc_${ele['id']}`) ? ele['activity_desc'] : customName;
                    }
                }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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