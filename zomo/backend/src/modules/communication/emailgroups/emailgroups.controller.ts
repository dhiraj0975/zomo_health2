import { CommonArrayService, CommonService, CommunicationEmailGroupsDto, tableConstant } from '@common-constants';
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
import { CreateCommunicationEmailGroupsInput, PaginateWithCommunicationInput } from 'src/input';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
@Controller('communication/email-groups')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class EmailGroupsController {
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
                where += ` AND communication.group_name LIKE '%${postData?.search_str}%'`;
            }
            const paginateObj = this.commonArrayService.getPaginationVar(
                postData?.page || 1,
                postData?.limit,
            );
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? `communication.${postData?.order_by}` : 'communication.created_date';
            let emailGroups = await lastValueFrom(this.client.send({ cmd: 'paginate_email_groups' }, {condition: where, order, orderBy, paginate: paginateObj}));
            if (emailGroups['list'].length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            emailGroups['list'] = <any>(await this.commonArrayService.formatToDto(CommunicationEmailGroupsDto, emailGroups['list'], req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: emailGroups,
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
            let emailGroups = await lastValueFrom(this.client.send({ cmd: 'get_one_email_groups' }, where));
            if (emailGroups.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            emailGroups = <any>(await this.commonArrayService.formatToDto(CommunicationEmailGroupsDto, emailGroups, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: emailGroups,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailGroupsInput) {
        try {
            postData.created_by = req.tokenUser?.id;
            postData.role_id = req.tokenUser?.role_id;
            await lastValueFrom(this.client.send({ cmd: 'create_email_groups' }, postData));
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Mailing Group successfully created',
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailGroupsInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let emailGroups = await lastValueFrom(this.client.send({ cmd: 'get_one_email_groups' }, where));
            postData.updated_by = req.tokenUser?.id;
            await lastValueFrom(this.client.send({ cmd: 'update_email_groups' }, postData));
            this.activityLogService.create(emailGroups, postData, tableConstant.COMMUNICATION.TBL_COM_EMAIL_GROUPS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Mailing Group successfully updated',
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
            const role_id = req.tokenUser?.role_id;
            let campRoleIdArr = [];
            if(role_id == 40 || role_id == 41 || role_id == 11){
                campRoleIdArr = [role_id];
            }else if(role_id == 39){
                campRoleIdArr = [role_id,40,11];
            }else{
                campRoleIdArr = [role_id,40,39,11];
            }
            let where = { id: postData?.id};
            let emailGroups = await lastValueFrom(this.client.send({ cmd: 'get_one_email_groups' }, where));
            if (!emailGroups) {
                throw new Error('Sorry! Default template is not found.');
            }else{
                let accessStatus = 1;
                const cam_role_id = emailGroups['role_id'];
                if(campRoleIdArr.includes(cam_role_id)){
                    accessStatus = 0;
                }
                let resMessage = '';
                if(accessStatus == 0){
                    if(postData?.status == 2){
                        resMessage = 'Mailing Group successfully deleted';
                    }else if(postData?.status == 0){
                        resMessage = 'Mailing Group successfully de-activted';
                    }else if(postData?.status == 1){
                        resMessage = 'Mailing Group successfully activated';
                    }
                    await lastValueFrom(this.client.send({ cmd: 'status_email_groups' }, postData));
                    this.activityLogService.create(emailGroups, postData, tableConstant.COMMUNICATION.TBL_COM_EMAIL_GROUPS, req.tokenUser?.id);
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: resMessage,
                    });
                }else{
                    throw new Error('Sorry! You are not authorized to access this template.');
                }
            }
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
            let emailGroups = await lastValueFrom(this.client.send({ cmd: 'list_email_groups' }, where));
            if (emailGroups.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: emailGroups,
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
