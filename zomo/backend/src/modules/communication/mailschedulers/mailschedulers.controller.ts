import { CommonArrayService, CommonService, CommunicationMailSchedulersDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { lastValueFrom } from 'rxjs';
import { CreateCommunicationMailSchedulersInput, PaginateWithCommunicationInput } from 'src/input';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
@Controller('communication/mail-schedulers')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class MailSchedulersController {
    constructor(
        @Inject('COMMUNICATION_SERVICE')
        private client: ClientProxy,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCommunicationInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `communication.status !=0 `;
            if(postData?.role_id){
                where +=`AND communication.role_id = '${postData?.role_id}' `;
            }
            if(postData?.org_id){
                where +=`AND communication.org_id = '${postData?.org_id}' `;
            }
            if(postData?.campaign_id){
                where +=`AND communication.campaign_id = '${postData?.campaign_id}' `;
            }
            if (postData?.search_str) {
                where += `AND(communication.from_email LIKE '%${postData?.search_str}%' OR communication.to_email LIKE '%${postData?.search_str}%' OR communication.user_json LIKE '%${postData?.search_str}%' OR communication.org_code LIKE '%${postData?.search_str}%')`;
            }
            const paginateObj = this.commonArrayService.getPaginationVar(
                postData?.page || 1,
                postData?.limit,
            );
            const order =
                postData && postData?.order
                    ? postData?.order
                    : 'DESC';
            const orderBy =
                postData && postData?.order_by
                    ? postData?.order_by
                    : 'communication.created_date';
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'paginate_mail_scheduler' }, {condition: where, order, orderBy, paginate: paginateObj}));
            if (campaignRequests.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignRequests['list'] = <any>(await this.commonArrayService.formatToDto(CommunicationMailSchedulersDto, campaignRequests['list'], req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: campaignRequests,
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'get_one_mail_scheduler' }, where));
            if (!campaignRequests) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignRequests = <any>(await this.commonArrayService.formatToDto(CommunicationMailSchedulersDto, campaignRequests, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: campaignRequests,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationMailSchedulersInput) {
        try {
            if (
                !postData?.role_id ||
                !postData?.campaign_id ||
                !postData?.from_email ||
                !postData?.to_email ||
                !postData?.schedule_datetime
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await lastValueFrom(this.client.send({ cmd: 'create_mail_scheduler' }, postData));
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
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'get_one_mail_scheduler' }, where));
            await lastValueFrom(this.client.send({ cmd: 'delete_mail_scheduler' }, where));
            this.activityLogService.create(campaignRequests, {status:2}, tableConstant.COMMUNICATION.TBL_COM_MAIL_SCHEDULERS, req.tokenUser?.id, 'delete');
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationMailSchedulersInput) {
        try {
            if (
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'get_one_mail_scheduler' }, where));
            await lastValueFrom(this.client.send({ cmd: 'update_mail_scheduler' }, postData));
            this.activityLogService.create(campaignRequests, postData, tableConstant.COMMUNICATION.TBL_COM_MAIL_SCHEDULERS, req.tokenUser?.id);
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
    async find(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let where = {};
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'list_mail_scheduler' }, where));
            if (campaignRequests.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignRequests = <any>(await this.commonArrayService.formatToDto(CommunicationMailSchedulersDto, campaignRequests, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: campaignRequests,
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
