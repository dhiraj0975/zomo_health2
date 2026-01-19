import { CommonArrayService, CommonService, CommunicationEmailConfigDto, tableConstant } from '@common-constants';
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
import { CreateCommunicationEmailConfigInput, PaginateWithCommunicationInput } from 'src/input';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
@Controller('communication/email-configs')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class EmailConfigController {
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
            let where = `communication.status = 1 `;
            if(postData?.status){
                where =`communication.status = '${postData?.status}' `;
            }
            if (postData?.search_str) {
                where += ` AND(communication.first_name LIKE '%${postData?.search_str}%' OR communication.last_name LIKE '%${postData?.search_str}%' OR communication.email LIKE '%${postData?.search_str}%')`;
            }
            const paginateObj = this.commonArrayService.getPaginationVar(
                postData?.page || 1,
                postData?.limit,
            );
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? `communication.${postData?.order_by}` : 'communication.created';
            let emailConfigs = await lastValueFrom(this.client.send({ cmd: 'paginate_email_configs' }, {condition: where, order, orderBy, paginate: paginateObj}));
            if (emailConfigs['list'].length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            emailConfigs['list'] = <any>(await this.commonArrayService.formatToDto(CommunicationEmailConfigDto, emailConfigs['list'], req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: emailConfigs,
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
            let emailConfigs = await lastValueFrom(this.client.send({ cmd: 'get_one_email_configs' }, where));
            if (emailConfigs.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            emailConfigs = <any>(await this.commonArrayService.formatToDto(CommunicationEmailConfigDto, emailConfigs, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: emailConfigs,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailConfigInput) {
        try {
            if (!postData?.email) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData.created_by = req.tokenUser?.id;
            postData.status = 1;
            await lastValueFrom(this.client.send({ cmd: 'create_email_configs' }, postData));
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Smtp Save succesfully',
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailConfigInput) {
        try {
            if (!postData?.id && !postData?.email) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let emailConfigs = await lastValueFrom(this.client.send({ cmd: 'get_one_email_configs' }, where));
            postData.updated_by = req.tokenUser?.id;
            await lastValueFrom(this.client.send({ cmd: 'update_email_configs' }, postData));
            this.activityLogService.create(emailConfigs, postData, tableConstant.COMMUNICATION.TBL_COM_EMAIL_CONFIGS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Smtp updated succesfully',
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
    @Post('status')
    async status(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && (postData?.status == undefined || postData?.status == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let resMessage = '';
            const where = { id: postData?.id };
            let emailConfigs = await lastValueFrom(this.client.send({ cmd: 'get_one_email_configs' }, where));
            if(postData?.status == 2){
                resMessage = 'Smtp successfully deleted';
            }else if(postData?.status == 0){
                resMessage = 'Smtp successfully de-activted';
            }else if(postData?.status == 1){
                resMessage = 'Smtp successfully activated';
            }
            await lastValueFrom(this.client.send({ cmd: 'status_email_configs' }, postData));
            this.activityLogService.create(emailConfigs, postData, tableConstant.COMMUNICATION.TBL_COM_EMAIL_CONFIGS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: resMessage,
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
            let where = { status: req.body.status || 1};
            let emailConfigs = await lastValueFrom(this.client.send({ cmd: 'list_email_configs' }, where));
            if (emailConfigs.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: emailConfigs,
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
