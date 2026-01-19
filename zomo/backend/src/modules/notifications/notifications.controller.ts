import { AccessGuard, RoleGuard, TokenGuard } from '@/guard';
import { CreateUserNotificationInput, PaginateInput } from '@/input';
import { appConstant, CommonArrayService, CommonDateService, CommonService, FirebaseService, tableConstant, UserNotificationDto } from '@common-constants';
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
import { In } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { CompanyService } from '../company/companies/company.service';
import { TranslationService } from '../translation/translation.service';
import { UserService } from '../user/user/user.service';
import { NotificationsService } from './notifications.service';
@Controller('notifications')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly commonDateService: CommonDateService,
        private readonly authService: AuthService,
        private readonly firebaseService: FirebaseService,
        private readonly userService: UserService,
        private readonly companyService: CompanyService
    ) { }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = (postData?.status != undefined || postData?.status != null) ? `notifications.status = ${postData?.status} ` : `notifications.status NOT IN(2,0) `;
            if (postData?.org_id) {
                where += ` AND notifications.org_id = ${postData?.org_id} `;
            }
            if (postData?.user_id) {
                where += ` AND notifications.user_id = ${postData?.user_id} `;
                if(postData?.date && (req.tokenUser?.role_id == appConstant.ROLE.REGISTERED || req.tokenUser?.role_id == appConstant.ROLE.SPOUSE)){
                   where += ` AND DATE(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(n.metadata, '$.notification_date')),'%Y-%m-%d')) <= DATE(${this.commonDateService.getTodayDate(postData?.date ?? 'now', 'YYYY-MM-DD')})`;
                }
            }
            if (postData?.search_str) {
                where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['notifications.title','notifications.message']);
            }
            const resultedData = await this.notificationsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UserNotificationDto, resultedData['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserNotificationInput) {
        try {
            if (!postData?.org_id || !postData?.user_id || !postData?.title || !postData?.module_name || !postData?.type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            if(!postData?.metadata){
                postData.metadata = {};
            }
            if(!postData?.metadata?.notification_date){
                postData.metadata.notification_date = this.commonDateService.getTodayDate('now', 'YYYY-MM-DD');
            }
            postData.metadata.notification_sent = postData?.metadata?.notification_sent ?? 1;
            postData.metadata.notification_sent_count = 0;
            await this.notificationsService.save({ ...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id });
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success")
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserNotificationInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = { id: postData?.id };
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            if(postData?.user_id){
                where['user_id'] = postData?.user_id;
            }
            const notificationCheck = await this.notificationsService.findOne(where);
            if (!notificationCheck) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            const resultedData = await this.notificationsService.update({ id: postData?.id }, { ...postData, updated_by: req.tokenUser?.id });
            this.activityLogService.create(notificationCheck, postData, tableConstant.TBL_USERS_NOTIFICATIONS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: resultedData.affected,
                message: (postData?.status != undefined || postData?.status != null) ? await this.translatorService.frontendReadTranslation(req.lang, "STATUS_UPDATED") : await this.translatorService.frontendReadTranslation(req.lang, "Success")
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
            const where = { id: postData?.id };
            const recordDetails = await this.notificationsService.findOne(where);
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
            await this.notificationsService.update(where, { status: 2 });
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.TBL_USERS_NOTIFICATIONS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_QUESTION_DELETED")
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
            if (postData?.org_id == undefined || postData?.org_id == null) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `notifications.status != 2 AND org_id = ${postData?.org_id}`;
            if(postData?.user_id){
                where += ` AND notifications.user_id = ${postData?.user_id}`;
                if(req.tokenUser?.role_id == appConstant.ROLE.REGISTERED){
                   where += ` AND DATE(STR_TO_DATE(JSON_UNQUOTE(JSON_EXTRACT(notifications.metadata, '$.notification_date')),'%Y-%m-%d')) <= DATE('${this.commonDateService.getTodayDate(postData?.date ?? 'now', 'YYYY-MM-DD')}')`;
                }
            }
            if(postData?.module_name){
                where += ` AND notifications.module_name = ${postData?.module_name}`;
            }
            let resultedData: any = await this.notificationsService.listRecord(null, { ...postData });
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UserNotificationDto, resultedData, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
            if (postData?.org_id) {
                where['org_id'] = postData?.org_id;
            }
            let recordDetails = await this.notificationsService.findOne(where);
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
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(UserNotificationDto, recordDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
                message: 'success',
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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
    @Post('mark-seen')
    async markSeen(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: In(postData?.id?.split(",")), status: 1 };
            if (postData?.org_id) {
                where['org_id'] = postData?.org_id;
            }
            const notificationCheck = await this.notificationsService.listRecord(['notifications.id','notifications.is_read'],where);
             if (notificationCheck?.length == 0) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.notificationsService.update(where, { is_read: 1 });
            notificationCheck?.map(ele=>this.activityLogService.create(ele, {is_read: 1}, tableConstant.TBL_USERS_NOTIFICATIONS, req.tokenUser?.id, postData?.type == 1 ? 'notification updated' : 'notification delete'));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
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

    async removeNotification(postData: any, req: Request){
        try{
            let where = `notifications.status !=2 AND notifications.is_read = 0`;
            if(postData?.code){
                let organizationDetails = await this.companyService.findOne({ code: postData?.code }, [], ['company.id']);
                postData.org_id = organizationDetails ? organizationDetails?.id : postData?.org_id;
            }
            if(postData?.org_id){
                where += ` AND notifications.org_id = ${postData?.['org_id']}`;
            }
            if(postData?.user_id){
                where += ` AND notifications.user_id = ${postData?.user_id}`;
            }
            if(postData?.id){
                where += ` AND JSON_EXTRACT(notifications.metadata, '$.id') = ${postData?.id}`;
            }
            if(postData?.schedule_id){
                where += ` AND JSON_EXTRACT(notifications.metadata, '$.schedule_id') = ${postData?.schedule_id}`;
            }
            if(postData?.event_id){
                where += ` AND JSON_EXTRACT(notifications.metadata, '$.event_id') = ${postData?.event_id}`;
            }
            if(postData?.plan_id){
                where += ` AND JSON_EXTRACT(notifications.metadata, '$.plan_id') = ${postData?.plan_id}`;
            }
            if(postData?.form_id){
                where += ` AND JSON_EXTRACT(notifications.metadata, '$.form_id') = ${postData?.form_id}`;
            }
            if(postData?.quiz_id){
                where += ` AND JSON_EXTRACT(notifications.metadata, '$.quiz_id') = ${postData?.quiz_id}`;
            }
            if(postData?.campaign_id){
                where += ` AND JSON_EXTRACT(notifications.metadata, '$.campaign_id') = ${postData?.campaign_id}`;
            }
            if(postData?.activity_id){
                where += ` AND JSON_EXTRACT(notifications.metadata, '$.activity_id') = ${postData?.activity_id}`;
            }
            const notificationCheck = await this.notificationsService.listRecord(['notifications.id','notifications.status'],where);
            this.notificationsService.removeEntry(where);
            notificationCheck?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.TBL_USERS_NOTIFICATIONS, req.tokenUser?.id, postData?.type == 1 ? 'notification updated' : 'notification delete'));
        }
        catch (error) {
            console.log('error', error);
            return
        }
    }
    async sendNotification(send_type: number, postData: CreateUserNotificationInput, req: Request){
        try{
            if(postData?.user_id){
                let notificationData = await this.notificationsService.save({ ...postData, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id });
                postData.metadata['id'] = notificationData?.['id'];
                if(send_type == 1){
                    let sentNotification = await this.sendNotificationImmediate({ user_id: postData?.user_id, payload: postData?.metadata, title: postData?.title, body: postData?.message });
                    if(!sentNotification){
                        await this.notificationsService.update({id: notificationData?.['id']},{metadata: {...notificationData?.['metadata'], notification_sent: 0}})
                    }
                }
            }
            else{
                const joinTableList = [{'alias':'user_token', 'table' : tableConstant.TBL_USERS_TOKEN, 'on' : `user_token.user_id = user.id` , 'connect' : 'user', 'type' : 'LEFT' }];
                let userList = await this.userService.getAllUsers(`user.org_id = ${postData?.org_id} AND user.status = 1 AND user.role_id in(2,16)`,['user.id','user_token.id','user_token.webToken','user_token.appToken'],joinTableList);
                await Promise.all(userList?.map(async (ele) =>{
                    let notificationData = await this.notificationsService.save({ ...postData, user_id: ele?.id, created_by: req.tokenUser?.id, updated_by: req.tokenUser?.id });
                    postData.metadata['id'] = notificationData?.['id'];
                    if(send_type == 1){
                        await this.sendNotificationImmediate({ user_id: ele?.id, user_token: ele?.['user_token'], payload: postData?.metadata, module_name: postData?.module_name, title: postData?.title, body: postData?.message });
                    }
                }));
            }
            return true;
        }
        catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error);
            return
        }
    }
    async sendNotificationImmediate(postData: any) {
        try {
            let user_id = postData?.user_id;
            let userToken = postData?.user_token ?? await this.authService.getUserDeviceToken({user_id});
            let tokens = [];
            if(userToken?.['webToken']){
                tokens.push(userToken['webToken']);
            }
            if(userToken?.['appToken']){
                tokens.push(userToken['appToken']);
            }
            postData.payload['c_type'] = postData?.module_name == 'Challenges' ? "challenge" : postData?.module_name;
            postData.payload['url'] = postData?.module_name == 'Challenges' ? `https://${process.env.DOMAIN}/my-challenges/${postData?.payload?.schedule_id}` : postData?.payload?.url ?? null;
            for(let token of tokens){
                await this.firebaseService.sendNotification(token, postData?.title, postData?.body, postData?.payload ?? {});
            }
            return tokens.length ? true : false;
        } catch (error) {
            await this.activityLogService.error_log(postData?.user_id, "sendNotificationImmediate", error?.message, error);
            return false;
        }
    }
}
