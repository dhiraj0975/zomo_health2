import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { appConstant, CommonArrayService, CommonDateService, CommonService, tableConstant, UcaManualUpcomingsDto } from '@common-constants';
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
import { PaginateWithCompanyInput } from 'src/input';
import { BrokerService } from 'src/modules/broker/broker.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Between, Like } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TranslationService } from "../../translation/translation.service";
import { CreateManualUpcomingsInput, DeleteManualUpcomingsInput, GetoneManualUpcomingsInput, ListManualUpcomingsInput, UpdateManualUpcomingsInput } from './input';
import { ManualUpcomingsService } from './manualupcomings.service';
@Controller('up-coming-activities/manual-up-comings')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ManualUpComingsController {
    constructor(
        private readonly manualUpcomingsService: ManualUpcomingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly brokerService: BrokerService,
        private readonly notificationsController: NotificationsController,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user = Object.create(req.tokenUser)
            let roleId = user.role_id;
            let userId = user.id;
            // Check for Broker-Admin, Broker, Regional-Admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }  
            let where = `manual.org_id = ${postData?.org_id} AND manual.status = '1'`;
            if (postData?.search_str) {     // bug sheet changes only title is in serach 
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['manual.title']);
            }
            let resultedData = await this.manualUpcomingsService.paginateList(
                where,
                postData,
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.displayoption == 1){
                        ele.auto_remove_date = ele.end_date;
                    }
                }));
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UcaManualUpcomingsDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${ele['id']}`, `/LC_MESSAGES/Dashboard/UpcomingActivities/${ele['org_id']}/${ele['id']}`,`dynamic`);
                        ele.title = (customName == '' || customName == `title_${ele['id']}`) ? ele['title'] : customName;
                    }
                    if(ele.description){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`description_${ele['id']}`, `/LC_MESSAGES/Dashboard/UpcomingActivities/${ele['org_id']}/${ele['id']}`,`dynamic`);
                        ele.description = (customName == '' || customName == `description_${ele['id']}`) ? ele['description'] : customName;
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateManualUpcomingsInput) {
        try {
            if (!postData?.org_id || !postData?.title) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let user = Object.create(req.tokenUser)
            let roleId = user.role_id;
            let userId = user.id;
            // Check for Broker-Admin, Broker, Regional-Admin role that org_id exits or not.
            if ([appConstant.ROLE.BROKERADMIN, appConstant.ROLE.BROKER, appConstant.ROLE.REGIONALADMIN].includes(req.tokenUser?.role_id)) {
                const checkRoleBBR = await this.brokerService.checkOrgAuthorization(
                    roleId,
                    userId,
                    postData?.org_id,
                );
                if (!checkRoleBBR) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                }
            }  
            if(postData?.auto_remove_date){
                postData.start_date = '0000-00-00 00:00:00';
                postData.end_date = '0000-00-00 00:00:00';
            }
            else{
                if(postData?.end_date){
                    postData.auto_remove_date =  postData?.end_date;
                }
            }
            let recordDetails = await this.manualUpcomingsService.save({...postData});
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `title_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }            
            if(postData?.description){
                let tilte = `description_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.description;
            }            
            await this.translatorService.DynamicEngJsonData('Dashboard',postData?.org_id,dynamicDatas,'Edit','UpcomingActivities',recordDetails['id']);
            this.addNotification({
                id: recordDetails?.['id'], 
                org_id: recordDetails?.['org_id'], 
                user_id: 0, 
                custom_cname: recordDetails?.['title'], 
                activity_id: recordDetails?.['id'],  
                logo:  null, 
                type: 'add',
                url: `https://${process.env.DOMAIN}/activities`,
                start_date: postData?.start_date,
                end_date: postData?.end_date
            }, req);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Activity has been created successfully.'
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateManualUpcomingsInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.manualUpcomingsService.findOne({ id: postData?.id,org_id: postData?.org_id});
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
            if(postData?.end_date){
                postData.auto_remove_date =  postData?.end_date;
            }
            await this.manualUpcomingsService.update({ id: postData?.id,org_id: postData?.org_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.UPCOMING_ACTIVITIES.TBL_UCA_MANUAL_UP_COMINGS, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `title_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }            
            if(postData?.description){
                let tilte = `description_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.description;
            }            
            await this.translatorService.DynamicEngJsonData('Dashboard',recordDetails.org_id,dynamicDatas,'Edit','UpcomingActivities',recordDetails['id']);
            if(postData?.start_date || postData?.end_date){
                let notificationData = {
                    custom_cname: recordDetails?.['title'],  
                    activity_id: recordDetails['id'], 
                    org_id: recordDetails?.org_id, 
                    id: recordDetails?.id,
                    type: 'update',
                    url: `https://${process.env.DOMAIN}/activities`,
                    logo: null
                };
                if(postData?.start_date){
                    notificationData['start_date'] = postData?.start_date;
                }
                if(postData?.end_date){
                    notificationData['end_date'] = postData?.end_date;                    
                }
                this.addNotification(notificationData, req);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Activity has been updated successfully.'
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteManualUpcomingsInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id, org_id: postData?.org_id };
            const recordDetails = await this.manualUpcomingsService.findOne({...where});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.manualUpcomingsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.UPCOMING_ACTIVITIES.TBL_UCA_MANUAL_UP_COMINGS, req.tokenUser?.id, 'delete');
            this.notificationsController.removeNotification({org_id: recordDetails?.org_id, activity_id: recordDetails?.id},req);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Activity has been deleted successfully.',
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneManualUpcomingsInput) {
        try {
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.manualUpcomingsService.findOne({id: postData?.id, org_id: postData?.org_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UcaManualUpcomingsDto, resultedData, req.lang)
            );
            if(resultedData.title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`title_${resultedData['id']}`, `/LC_MESSAGES/Dashboard/UpcomingActivities/${resultedData['org_id']}/${resultedData['id']}`,`dynamic`);
                resultedData.title = (customName == '' || customName == `title_${resultedData['id']}`) ? resultedData['title'] : customName;
            }
            if(resultedData.description){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`description_${resultedData['id']}`, `/LC_MESSAGES/Dashboard/UpcomingActivities/${resultedData['org_id']}/${resultedData['id']}`,`dynamic`);
                resultedData.description = (customName == '' || customName == `description_${resultedData['id']}`) ? resultedData['description'] : customName;
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListManualUpcomingsInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: any = {org_id: postData?.org_id, status: '1'};
            if (postData?.search_str) {
                if(this.commonDateService.isValidDate(postData?.search_str)){
                    where = [
                        { org_id: postData?.org_id, status: '1', start_date: Between(`${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 00:00:00`, `${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 23:59:59`) },
                        { org_id: postData?.org_id, status: '1', end_date: Between(`${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 00:00:00`, `${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 23:59:59`) },
                        { org_id: postData?.org_id, status: '1', auto_remove_date: Between(`${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 00:00:00`, `${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 23:59:59`) },
                    ];
                }
                else{
                    where = [
                        { org_id: postData?.org_id, status: '1', title: Like('%' + postData?.search_str + '%') },
                        { org_id: postData?.org_id, status: '1', description: Like('%' + postData?.search_str + '%') },
                        { org_id: postData?.org_id, status: '1', link: Like('%' + postData?.search_str + '%') }
                    ];
                }
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let resultedData = await this.manualUpcomingsService.listRecord(["id","org_id","title","description",'auto_remove_date',"link","start_date","end_date","end_date","displayoption","status","created_date","update_date"],where, { [orderBy]: order });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UcaManualUpcomingsDto, resultedData, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        if (ele.title) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `title_${ele['id']}`, `/LC_MESSAGES/Dashboard/UpcomingActivities/${ele['org_id']}/${ele['id']}`, `dynamic`);
                            ele.title = (customName == '' || customName == `title_${ele['id']}`) ? ele['title'] : customName;
                        }
                        if (ele.description) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `description_${ele['id']}`, `/LC_MESSAGES/Dashboard/UpcomingActivities/${ele['org_id']}/${ele['id']}`, `dynamic`);
                            ele.description = (customName == '' || customName == `description_${ele['id']}`) ? ele['description'] : customName;
                        }
                    }));
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    async addNotification(activityData: any, req: Request) {
        try {
            if(activityData?.type == 'add' || activityData?.type == 'update'){
                if(activityData?.type == 'update'){
                    let whereCondition = { org_id: activityData?.org_id };
                    if(activityData?.activity_id || activityData?.activity_id == 0){ 
                        whereCondition['activity_id'] = activityData?.activity_id;
                    }
                    await this.notificationsController.removeNotification(whereCondition,req);
                }
                let notificationData = {
                    org_id: activityData.org_id,
                    user_id: 0,
                    title: activityData?.title ?? "Upcoming Activity",
                    message: `${activityData?.custom_cname} - Upcoming Activity`,
                    type: 1,
                    module_name: 'Upcoming Activity',
                    submodule_name: 'UpcomingActivities',
                    metadata: {
                        activity_id: activityData?.activity_id,
                        id: activityData?.id,
                        logo: activityData?.logo,
                        url: activityData?.url,
                        notification_date: null,
                        notification_sent: 0,
                        notification_sent_count: 0,
                    },
                };
                if(activityData?.start_date){ 
                    if(activityData?.start_date?.includes('/')){
                        activityData.start_date = await this.commonDateService.getTodayDate(activityData?.start_date, 'MM/DD/YYYY')
                    }
                    let startDate = this.commonDateService.getTodayDate(activityData?.start_date).format('YYYY-MM-DD');
                    let notificationDate = this.commonDateService.getTodayDate(activityData?.start_date).subtract(1, 'days').format('YYYY-MM-DD');
                    notificationData['metadata']['notification_date'] = notificationDate;
                    notificationData['metadata']['start_date'] = startDate;
                    notificationData['metadata']['notification_sent'] = 0;
                    notificationData['message'] = notificationData['message'] + ' starts Tomorrow';
                    await this.notificationsController.sendNotification(0, notificationData, req);
                }  
            }
            return;
        }
        catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return
        }
    }
}