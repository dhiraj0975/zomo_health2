import { CommonArrayService, CommonService, FtAuthorizedUsersDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus, Inject,
    Post,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { TranslationService } from "../../translation/translation.service";
import { CreateFtAuthorizedUsersInput, GetDailyStepsInput, PaginateWithAuthUserInput } from './input';
@Controller('tracker/authorized-users')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class FtAuthorizedUsersController {
    constructor(
        @Inject('FITBIT_SERVICE')
        private fitbitClient: ClientProxy,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }

    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithAuthUserInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `authUser.id !=0  AND authUser.status = 1 `;
            if(postData?.app_id){
                where +=`AND authUser.app_id = '${postData?.app_id} `;
            }
            if(postData?.user_id){
                where +=`AND authUser.user_id = '${postData?.user_id} `;
            }
            if (postData?.search_str) {
                where += `AND(authUser.username LIKE '%${postData?.search_str}%' OR authUser.app_name LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await lastValueFrom(this.fitbitClient.send({ cmd: 'paginate_auth_users' }, {where: where, paginationParam: postData}));
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(FtAuthorizedUsersDto, resultedData['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    @Post('get-authorization')
    async getAuthorization(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.username) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `authUser.status!=2 AND authUser.app_name='Fitbit' AND authUser.username='${postData.username}'`;
            let authUserDetails = await lastValueFrom(this.fitbitClient.send({ cmd: 'get_one_auth_user' }, {where: where, fields: ['authUser.id']}));
            if (authUserDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "Common_Error_Email_Already_Registered", '/LC_MESSAGES/Api');
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            const fitbitAuthUrl = await lastValueFrom(this.fitbitClient.send({ cmd: 'get_auth_url_fitbit' }, {}));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: fitbitAuthUrl,
                message: 'success',
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
            if (!postData?.id && !postData?.user_id && !postData?.username) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `authUser.status != 2`;
            if (postData?.id) {
                where +=` AND authUser.id = '${postData.id}'`;
            }
            if (postData?.user_id) {
                where +=` AND authUser.user_id = '${postData.user_id}'`;
            }
            if (postData?.username) {
                where +=` AND authUser.username = '${postData.username}'`;
            }
            if (!postData?.id && postData?.user_id) {
                where +=` AND authUser.app_name='Fitbit' AND authUser.statusFB='NA'`;
            }
            let authUserDetails = await lastValueFrom(this.fitbitClient.send({ cmd: 'get_one_auth_user' }, {where: where, fields: ['authUser.id', 'authUser.username']}));
            if (!authUserDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            authUserDetails = <any>(
                await this.commonArrayService.formatToDto(FtAuthorizedUsersDto, authUserDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: authUserDetails,
                message: 'success',
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateFtAuthorizedUsersInput) {
        try {
            if (!postData?.code || !postData?.username) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `authUser.status!=2 AND authUser.app_name='Fitbit' AND authUser.user_id='${req.tokenUser.id}'`;
            const authUserDetails = await lastValueFrom(this.fitbitClient.send({ cmd: 'get_one_auth_user' }, {where: where, fields: ['authUser.id']}));
            if (authUserDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "Common_Error_Email_Already_Registered", '/LC_MESSAGES/Api');
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            const userFitbitAuthStatus = await lastValueFrom(this.fitbitClient.send({ cmd: 'create_auth_user' }, {code: postData?.code, username: postData?.username, user_id: req.tokenUser.id}));
            let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_COMMON_ERROR", '/LC_MESSAGES/Api');
            if(userFitbitAuthStatus === "FITBIT_CODE_ERROR") {
                errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_CODE_ERROR", '/LC_MESSAGES/Api');
            } else if(userFitbitAuthStatus === "FITBIT_PROFILE_ERROR") {
                errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_PROFILE_ERROR", '/LC_MESSAGES/Api');
            } else if(userFitbitAuthStatus === "USER_FITBIT_ACCOUNT_LINKED_WITH_ANOTHER_USER") {
                errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "USER_FITBIT_ACCOUNT_LINKED_WITH_ANOTHER_USER", '/LC_MESSAGES/Api');
            } else if(userFitbitAuthStatus === "SUCCESS") {
                let authUserDetails = await lastValueFrom(this.fitbitClient.send({ cmd: 'get_one_auth_user' }, {where: where, fields: ['authUser.id', 'authUser.user_id', 'authUser.username', 'authUser.token_key', 'authUser.app_id']}));
                authUserDetails = <any>(
                    await this.commonArrayService.formatToDto(FtAuthorizedUsersDto, authUserDetails, req.lang)
                );
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: authUserDetails,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_SYNC"),
                });
            }
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, userFitbitAuthStatus, userFitbitAuthStatus, req);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: errorMessage,
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    @Post('daily-steps')
    async getDailySteps(@Req() req: Request, @Res() res: Response, @Body() postData: GetDailyStepsInput) {
        try {
            const { date, user_id } = postData;
            if (!date) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Common_fitbit_date_required_format", '/LC_MESSAGES/Api'));
            }
            const userId = user_id ?? req.tokenUser.id;
            let where = `authUser.status!=2 AND authUser.app_name='Fitbit' AND authUser.user_id='${userId}'`;
            const authUserDetails = await lastValueFrom(this.fitbitClient.send({ cmd: 'get_one_auth_user' }, {where: where, fields: ['authUser.id', 'authUser.user_id', 'authUser.username', 'authUser.token_key', 'authUser.app_id']}));
            if (!authUserDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_AUTH_NOT_FOUND", '/LC_MESSAGES/Api');
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            /* zomo-923 changes added for 1 month */
            const syncStatus = await lastValueFrom(this.fitbitClient.send({ cmd: 'sync_fitbit_steps' }, { authUser: authUserDetails, date: date, duration: '1m' }));
            let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_COMMON_ERROR", '/LC_MESSAGES/Api');
            let errorResponse = {
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: errorMessage,
            }
            if(syncStatus === "SUCCESS") {
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "Common_Your_daily_steps_retrived", '/LC_MESSAGES/Api')
                });
            } else if(syncStatus === "FITBIT_STEP_SYNC_CODE_ERROR") {
                errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_STEP_SYNC_CODE_ERROR", '/LC_MESSAGES/Api');
            } else if(syncStatus === "FITBIT_STEP_DATA_NOT_FOUND") {
                errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_STEP_DATA_NOT_FOUND", '/LC_MESSAGES/Api');
            } else if(syncStatus === "FITBIT_MISSING_PARAMS") {
                errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_MISSING_PARAMS", '/LC_MESSAGES/Api');
            } else if(syncStatus === "FITBIT_MISSING_AUTH_PARAMS") {
                errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_MISSING_AUTH_PARAMS", '/LC_MESSAGES/Api');
            } else if(syncStatus === "FITBIT_REFRESH_TOKEN_ERROR") {
                errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_REFRESH_TOKEN_ERROR", '/LC_MESSAGES/Api');
            } else if(syncStatus === "FITBIT_STEP_API_ERROR") {
                errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_STEP_API_ERROR", '/LC_MESSAGES/Api');
            }
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, syncStatus, syncStatus, req);
            if(syncStatus === "FITBIT_STEP_DATA_NOT_FOUND") {
                errorResponse['noData'] = 1;
            }
            errorResponse['message'] = errorMessage;
            return res.status(HttpStatus.OK).json(errorResponse);
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
            const where = `id='${postData.id}' AND status != 2`;
            const recordDetails = await lastValueFrom(this.fitbitClient.send({ cmd: 'get_one_auth_user' }, {where: where, fields: ['authUser.id']}));
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
            await lastValueFrom(this.fitbitClient.send({ cmd: 'delete_auth_user' }, {condition: where, data: {status: 2}}));
            await this.activityLogService.create(recordDetails, {token_key: recordDetails}, tableConstant.TRACKERS.TBL_FT_AUTHORIZED_USERS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "FITBIT_UNSYNC"),
            });
        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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