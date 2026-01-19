import { appConstant, CommonDateService, CommonService, FirebaseService } from '@common-constants';
import { Body, Controller, Get, HttpException, HttpStatus, Inject, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import 'dotenv/config';
import { Request, Response } from "express";
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { AccessGuard, RoleGuard, TokenGuard } from 'src/guard';
import { AuthService } from '../auth/auth.service';
import { ActivityLogService } from "../master/activitylog/activitylog.service";
import { TranslationService } from '../translation/translation.service';
const S3_URL =  process.env.S3_URL_PROD;
const moment = require('moment-timezone');
@Controller('internal')
export class InternalController {
    constructor(
        private readonly authService: AuthService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        @Inject('POSTCODES_SERVICE')
        private timeZoneMicroservice: ClientProxy,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        @Inject('CRON_SERVICE')
        private cronMicroservice: ClientProxy,
        @Inject('COMMUNICATION_SERVICE')
        private communicationMicroservice: ClientProxy,
        @Inject('FOOD_SERVICE')
        private foodMicroservice: ClientProxy,
        @Inject('ACTIVITYLOG_SERVICE')
        private activitylogMicroservice: ClientProxy,
        @Inject('FITBIT_SERVICE')
        private fitBitMicroservice: ClientProxy,
        @Inject('CENSUS_SERVICE')
        private censusMicroservice: ClientProxy,
        @Inject('ONBOARDING_MICROSERVICE')
        private readonly onboardingMicroservice: ClientProxy,
        @Inject('TRANSLATION_MICROSERVICE')
        private readonly translationMicroservice: ClientProxy,
        private readonly firebaseService: FirebaseService,
        private readonly activityLogService: ActivityLogService,
    ) { }
    @Post('send-notification')
    @UseGuards(TokenGuard)
    async sendNotification(@Res() res, @Req() req, @Body() postData: any) {
        try {
            if (!postData?.title && !postData?.body) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user_id = req?.tokenUser?.id ?? postData?.user_id;
            let userToken = await this.authService.getUserDeviceToken({user_id});
            const deviceDetails = this.commonService.getClientIPAndDeviceDetails(req);
            if (deviceDetails && deviceDetails.os_name) {
                switch (deviceDetails.os_name) {
                    case 'Windows':
                    case 'browser':
                        postData.token = userToken['webToken'];
                        break;
                    case 'Android':
                    case 'IOS':
                        postData.token = userToken['appToken'];
                        break;
                    default:
                        break;
                }
            }
            await this.firebaseService.sendNotification(postData?.token,postData?.title,postData?.body,postData?.payload ?? {});
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Notification send Successfully',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('send-email')
    async sendEmail(@Res() res, @Req() req, @Body() postData: any) {
        try {
            if (!postData?.subject && postData?.toEmail) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let attachmentarray = []
            if(postData?.attachment){   
                const filePath = path.join(process.cwd(), 'public', postData?.attachment);
                attachmentarray.push({
                    filename : postData?.attachment.split('/')[postData?.attachment.split('/').length -1],
                    path: filePath
                }); 
            }
            let emailDetails = {
                sender: postData?.sender ?? `Zomo Health<noreply@${process.env.DOMAIN}>`,
                receiver: postData?.toEmail,
                subject: postData?.subject,
                content: postData?.emailDetails,
                template: postData?.content,
                attachment: attachmentarray
            }
            await lastValueFrom(this.commonMicroservice.send({cmd: 'send_email'}, emailDetails));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'e-mail sent successfully',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    /* temp api for nitesh to check microservices running or not will remove in demo and prod*/
    @Post('check-port')
    async checkPort(@Res() res, @Req() req, @Body() postData: any) {
        try {
            if (!postData?.port) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let service;
            switch (postData?.port) {
                case process.env.TIMEZONES_SERVICE_PORT_PROD:
                    service = this.timeZoneMicroservice;
                    break;
                case process.env.COMMUNICATION_SERVICE_PORT_PROD:
                    service = this.communicationMicroservice;
                    break;
                case process.env.CRON_SERVICE_PORT_PROD:
                    service = this.cronMicroservice;
                    break;
                case process.env.FOOD_SERVICE_PORT_PROD:
                    service = this.foodMicroservice;
                    break;
                case process.env.ACTIVITYLOG_SERVICE_PORT_PROD:
                    service = this.activitylogMicroservice;
                    break;
                case process.env.COMMON_SERVICE_PORT_PROD:
                    service = this.commonMicroservice;
                    break;
                case process.env.FITBIT_SERVICE_PORT_PROD:
                    service = this.fitBitMicroservice;
                    break;
                case process.env.CENSUS_SERVICE_PORT_PROD:
                    service = this.censusMicroservice;
                    break;
                case process.env.ONBOARDING_SERVICE_PORT_PROD:
                    service = this.onboardingMicroservice;
                    break;
                case process.env.TRANSLATION_SERVICE_PORT_PROD:
                    service = this.translationMicroservice;
                    break;
                default:
                    break;
            }
            let result = false;
            if(service){
              result = await lastValueFrom(service.send({cmd: 'test'}, {}));
            }
            let status = HttpStatus.NOT_FOUND;
            let success = 0;
            let error = 1;
            if(result){
                status = HttpStatus.OK;
                success = 1;
                error = 0;
            }
            return res.status(status).json({
                statusCode: status,
                success,
                error,
                data: null,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return res.status(404).json({
                statusCode: 404,
                success: 0,
                error: 1,
                message: error?.message,
                data: null,
            });
        }
    }
    @Post('check-translation')
    async checkTranslation(@Res() res, @Req() req, @Body() postData: any) {
        try {
            let result = '';;
            if(!postData?.action){
                result = await lastValueFrom(this.translationMicroservice.send({cmd: 'create_file' }, {}));
            }else{
                result = await lastValueFrom(this.translationMicroservice.send({cmd: postData.action }, {}));
            }

            let status = HttpStatus.NOT_FOUND;
            let success = 0;
            let error = 1;
            if(result){
                status = HttpStatus.OK;
                success = 1;
                error = 0;
            }
            return res.status(status).json({
                statusCode: status,
                success,
                error,
                data: result,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return res.status(404).json({
                statusCode: 404,
                success: 0,
                error: 1,
                message: error?.message,
                data: null,
            });
        }
    }
    /*
    * Use to list all object for particular prefix
    * - prefix is mandatory params
    */
    @Post('list-images')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async stockImages(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let data = [];
            if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let prefix = postData?.prefix;
                let list = await lastValueFrom(this.commonMicroservice.send({cmd: 'list_file'}, {prefix: prefix, userBucket: postData?.userBucket == 'public' ? 'public' : 'private'})); 
                if(list?.Contents){
                    for(let ele of list?.Contents){
                        data.push({name: ele['Key'], image: S3_URL + ele['Key'], time: ele.LastModified, size: ele.Size, ETag: ele.ETag});
                    }
                }
            }
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                });
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
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
    @Get('manual-cron')
    async downloadFormsProcess(@Req() req: Request, @Res() res: Response, @Query() postData: any) {
        try {
            if(!postData?.name){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await lastValueFrom(this.cronMicroservice.send({ cmd: 'manual_cron_start' }, { name: postData?.name, time: 1 }));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(0,req?.originalUrl, error?.message, error, req);
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

    @Post('cohort-report')
    async cohortReport(@Req() req: Request, @Res() res: Response, @Query() postData: any) {
        try {
            await lastValueFrom(this.cronMicroservice.send({ cmd: 'cohort-report' }, { }));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            console.log(error);
            this.activityLogService.error_log(0,req?.originalUrl, error?.message, error, req);
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

    @Post('user-event-timezone') // testing new Date
    async userEventTimezone(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const newDateTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const newDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            // event timezone  
            let event_timezone = "America/New_York";
            // user timezone  
            let user_timezone = "Asia/Calcutta";
            let options: Intl.DateTimeFormatOptions = {
                year: 'numeric',       
                month: '2-digit',      
                day: '2-digit',        
                hour: '2-digit',       
                minute: '2-digit',     
                second: '2-digit',     
                timeZone: event_timezone, 
                hour12: false
              };
            const newDateWithEventTimezone = now.toLocaleString('en-US', options);
            options['timeZone'] = user_timezone;
            const newDateWithUserTimezone = now.toLocaleString('en-US', options);
            const getTodayDate = moment.utc(this.commonDateService.getTodayDate());
            let getTodayDateWithEventTimezone = getTodayDate.clone().tz(event_timezone).format('YYYY-MM-DD HH:mm:ss [UTC]Z');
            let getTodayDateWithUserTimezone = getTodayDate.clone().tz(user_timezone).format('YYYY-MM-DD HH:mm:ss [UTC]Z');
            const DateTimeFormat = this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss');
            let DateTimeFormatWithEventTimezone = this.commonDateService.DateTimeFormat(DateTimeFormat,"YYYY-MM-DD HH:mm:ss",'',event_timezone);
            let DateTimeFormatWithUserTimezone = this.commonDateService.DateTimeFormat(DateTimeFormat,"YYYY-MM-DD HH:mm:ss",'',user_timezone);
            const momentTimezone = moment.tz.guess();
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { newDate, newDateWithEventTimezone, newDateWithUserTimezone, getTodayDate, getTodayDateWithEventTimezone, getTodayDateWithUserTimezone, DateTimeFormat, DateTimeFormatWithEventTimezone, DateTimeFormatWithUserTimezone, newDateTimezone, momentTimezone },
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
