import { appConstant, CommonArrayService, CommonFileService, FormSendRequestUserDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards
} from '@nestjs/common';
import { Request, Response } from "express";
import { PaginateWithCampaignInput } from 'src/modules/campaign/input';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateFormSendRequestUserInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { FormSendRequestUserService } from './formsendrequestuser.service';
@Controller('health-checkup/form-send-request-user')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FormSendRequestUserController {
    constructor(
        private readonly FormSendRequestUserService: FormSendRequestUserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) { }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCampaignInput) {
        try {
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
                let where = `Formsendrequestuser.org_id = ${postData?.org_id} AND Formsendrequestuser.request_id = ${postData?.request_id} `;
                if (postData?.user_id) {
                    where += `AND Formsendrequestuser.user_id = '${postData?.user_id}' `;
                }
                if (postData?.filter_by == 'email') {
                    where += `AND user.email LIKE '%${postData?.search_str}%' `;
                }
                if (postData?.filter_by == 'name') {
                    where += ` AND (user.first_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR user.last_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR CONCAT(user.first_name, ' ', user.last_name) LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%')`;
                }
                if(postData?.filter_by == 'all'){
                    where += ` AND (user.first_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR user.last_name LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR CONCAT(user.first_name, ' ', user.last_name) LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' OR user.email LIKE '%${postData?.search_str}%')`;
                }
                if (postData?.status) {
                    where += `AND Formsendrequestuser.email_status = '${postData?.status}' `;
                }
                const resultedData = await this.FormSendRequestUserService.paginateList(
                    where,
                    ['Formsendrequestuser', 'user.id', 'user.code', 'user.first_name', 'user.last_name', 'user.email'],
                    postData,
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(FormSendRequestUserDto, resultedData['list'], req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFormSendRequestUserInput) {
        try {
            if (!postData?.file) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            await this.FormSendRequestUserService.save({ ...postData });
            return res.status(HttpStatus.OK).json({
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFormSendRequestUserInput) {
        try {
            if (!postData?.id || !postData?.file) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.FormSendRequestUserService.findOne({
                id: postData?.id,
                file: postData?.file
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.FormSendRequestUserService.update({ id: postData?.id, file: postData?.file },{status: 2});
            this.activityLogService.create(recordDetails, { file: recordDetails }, tableConstant.HEALTH_CHECKUP.TBL_HC_ZIP_DOWNLOADS, req.tokenUser?.id, 'delete');
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFormSendRequestUserInput) {
        try {
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                if (!postData?.org_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                }
                const recordDetails = await this.FormSendRequestUserService.listRecord({ org_id: postData?.org_id });
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: recordDetails,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
}