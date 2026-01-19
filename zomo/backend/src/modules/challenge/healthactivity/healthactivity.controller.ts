import { appConstant, CommonArrayService, CommonService, HealthActivityDto, tableConstant } from '@common-constants';
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
    CreateHealthActivityInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    PaginateWithChallengeInput,
    UpdateHealthActivityInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { HealthActivityService } from './healthactivity.service';
@Controller('challenge/health-activity')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class HealthActivityController {
    constructor(
        private readonly healthActivityService: HealthActivityService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.ORGADMIN == req.tokenUser?.role_id || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? `ha.status != 2` : `ha.status = 1`;
            if (postData?.schedule_id) {
                where += ` AND ha.schedule_id = ${postData?.schedule_id}`;
            }
            if (postData?.org_id) {
                where += ` AND ha.org_id = ${postData?.org_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'ha.name');
            }
            const resultedData = await this.healthActivityService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(HealthActivityDto, resultedData['list'], req.lang)
            );
            if(![appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)){
                await Promise.all(resultedData['list'].map(async (ele) => {
                    if(ele.name){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`healactivity_name_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                        ele.name = (customeName == '' || customeName == `healactivity_name_${ele.schedule_id}_${ele['id']}`) ? ele['name'] : customeName;
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateHealthActivityInput) {
        try {
            if (!postData?.schedule_id || !postData?.org_id || !postData?.name) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let recordDetails = await this.healthActivityService.save({...postData});
            let dynamicDatas = Object.create(null);
            /*
            if(postData?.name){
                let tilte = `name${postData?.schedule_id}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }    
            */        
            if(postData?.name){
                let tilte = `healactivity_name_${postData?.schedule_id}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',postData?.org_id,dynamicDatas,'Edit','MyChallenges',postData['schedule_id']);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Activity has been successfully saved.')
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateHealthActivityInput) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.healthActivityService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            let dynamicDatas = Object.create(null);
            /*
            if(postData?.name){
                let tilte = `name${postData?.schedule_id}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            } 
            */           
            if(postData?.name){
                let tilte = `healactivity_name_${postData?.schedule_id}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',postData?.org_id,dynamicDatas,'Edit','MyChallenges',postData['schedule_id']);
            await this.healthActivityService.update({ id: postData?.id, schedule_id: postData?.schedule_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_HEALTH_ACTIVITY, req.tokenUser?.id);
            let message
            if(Object.keys(postData).length && postData?.hasOwnProperty('status')){
                message = 'Activity status change succesfully'; 
            } 
            else{
                message =  'Activity has been successfully update.';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,message)
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
            const recordDetails = await this.healthActivityService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.healthActivityService.update({id: postData?.id, schedule_id: postData?.schedule_id},{status:2});
            if (recordDetails) {
                const titleKey = `healactivity_name_${recordDetails.schedule_id}_${recordDetails.id}`;
                const dynamicData = {
                    [titleKey]: titleKey,
                };
                await this.translatorService.DynamicEngJsonData(
                    'Challenge',
                    recordDetails.org_id,
                    dynamicData,
                    'Delete',
                    'MyChallenges',
                    recordDetails.schedule_id
                );
            }
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_HEALTH_ACTIVITY, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Activity remove succesfully'),
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneChallengeInput) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.healthActivityService.findOne({id: postData?.id, schedule_id: postData?.schedule_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(HealthActivityDto, resultedData, req.lang)
            );
            if(resultedData.name){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`healactivity_name_${resultedData.schedule_id}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${resultedData.org_id}/${resultedData.schedule_id}`,`dynamic`);
                resultedData.name = (customeName == '' || customeName == `healactivity_name_${resultedData.schedule_id}_${resultedData['id']}`) ? resultedData['name'] : customeName;
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
            let where: any = { };            
            if(postData?.org_id){
                where['org_id']= postData?.org_id;
            }
            if(postData?.schedule_id){
                where['schedule_id']= postData?.schedule_id;
            }
            let result = await this.healthActivityService.listRecord(where);
            result = <any>(
                await this.commonArrayService.formatToDto(HealthActivityDto, result, req.lang)
            );
            await Promise.all(result.map(async (ele) => {
                if(ele.name){
                    let customeName = await this.translatorService.frontendReadTranslation(req.lang,`healactivity_name_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                    ele.name = (customeName == '' || customeName == `healactivity_name_${ele.schedule_id}_${ele['id']}`) ? ele['name'] : customeName;
                }
            }));
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
    @Post('activate-deactivate')
    async activateDeactivate(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {  
            let data = {};      
            let message;   
            if(postData?.action == 'activate'){
                data['status'] = 1;
                message = 'Activities successfully activated';
            }
            if(postData?.action == 'deactivate'){
                data['status'] = 0;
                message = 'Activities successfully deactivated';
            }
            if(postData?.action == 'delete'){
                data['status'] = 2;
                message = 'Activities successfully deleted';
            }
            for(let ele of postData?.id.split(',')){
                let resultedData = await this.healthActivityService.findOne({id: ele});
                await this.healthActivityService.update({id: resultedData.id},data);
                this.activityLogService.create(resultedData, data, tableConstant.CHALLENGE.TBL_CH_HEALTH_ACTIVITY, req.tokenUser?.id, postData?.action);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: [],
                message: await this.translatorService.frontendReadTranslation(req.lang,message),
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