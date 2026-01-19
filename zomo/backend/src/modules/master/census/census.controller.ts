import { tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { TranslationService } from "src/modules/translation/translation.service";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { ImportUserRequestService } from "../../user/importuserrequest/importuserrequest.service";
import { ActivityLogService } from "../activitylog/activitylog.service";
@Controller('census')
export class CensusController {
    constructor(
        @Inject('CRON_SERVICE')
        private client: ClientProxy,
        @Inject('CENSUS_SERVICE')
        private censusMicroservice: ClientProxy,
        private readonly translatorService: TranslationService,
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('import-user-process')
    @UseGuards(TokenGuard, RoleGuard, AccessGuard)
    async importUserProcess(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.count || !postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.importUserRequestService.findOne({hash: postData?.id,status: '10'},{id: "DESC"},['org_id','mapped_header','origional_file']);
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
            const source_type = postData?.count > 700 ? 1 : 2;

            const updateData = {
                status: '0',
                flage: '0',
                requeststep: '0',
                source_type,
            };

            await this.importUserRequestService.update({ hash: postData?.id }, updateData);

            this.activityLogService.create(
                recordDetails,
                updateData,
                tableConstant.TBL_IMPORT_USER_REQUEST,
                req.tokenUser?.id
            );

            const message = await this.translatorService.frontendReadTranslation(req.lang, "MSG_IMPORT_USER_PROCESS");

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { source_type },
                message,
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

    @Post('import-user-process-step')
    async importUserProcessStep(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const { id, step = 'import-user-process-backup' } = postData;

            if (!id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const stepDefinitions = new Map<string, number>([
                ['import-user-process-backup', 11.11],
                ['import-user-process-skip', 11.11],
                ['import-user-process-dept', 22.22],
                ['import-user-process-loc', 33.33],
                ['import-user-process-sys', 44.44],
                ['import-user-process-settings', 55.55],
                ['import-user-process-custom-field', 66.66],
                ['import-user-process-create-file', 77.77],
                ['import-user-process-email',88.88]
            ]);

            const stepList = Array.from(stepDefinitions.keys());
            if (!stepDefinitions.has(step)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_STEP"));
            }

            const stepIndexStr = stepList.indexOf(step).toString();

            const recordDetails = await this.importUserRequestService.findOne(
                { hash: id, status: '0', flage: stepIndexStr, requeststep: stepIndexStr },
                { id: "DESC" }
            );

            if (!recordDetails) {
                const errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }

            const data = await lastValueFrom(this.censusMicroservice.send({ cmd: step }, postData));

            if (data?.next_step === 'finish') {
                data.progress = 100;
            } else if (stepDefinitions.has(data.next_step)) {
                data.progress = stepDefinitions.get(data.next_step);
            } else {
                const errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_SOMETHING_WENT_WRONG");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            }
            const successMessage = await this.translatorService.frontendReadTranslation(req.lang, "CENSUS_UPLOAD_SUCCESS");
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data,
                message: successMessage,
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message || 'An unexpected error occurred',
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    @Post('import-user-process-skip')
    async importUserProcessSkip(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.importUserRequestService.findOne({hash: postData?.id, status: '0', flage: '0', requeststep: '0'},{id: "DESC"});
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
            postData = {...postData,...{name: 'import-user-process-skip'}}
            let data = await lastValueFrom(this.client.send({cmd: 'import_user_process'}, postData));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: 'Skip process completed successfully',
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
    @Post('import-user-process-dept')
    async importUserProcessDept(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.importUserRequestService.findOne({hash: postData?.id, status: '0', flage: '4', requeststep: '4'},{id: "DESC"});
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
            postData = {...postData,...{name: 'import-user-process-department'}}
            let data = await lastValueFrom(this.client.send({cmd: 'import_user_process'}, postData));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: 'Department process completed successfully',
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
    @Post('import-user-process-loc')
    async importUserProcessLoc(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.importUserRequestService.findOne({hash: postData?.id, status: '0', flage: '1', requeststep: '1'},{id: "DESC"});
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
            postData = {...postData,...{name: 'import-user-process-location'}}
            let data = await lastValueFrom(this.client.send({cmd: 'import_user_process'}, postData));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: 'Location process completed successfully',
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
    @Post('import-user-process-sys')
    async importUserProcessSys(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.importUserRequestService.findOne({hash: postData?.id, status: '0', flage: '2', requeststep: '2'},{id: "DESC"});
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
            postData = {...postData,...{name: 'import-user-process-system'}}
            let data = await lastValueFrom(this.client.send({cmd: 'import_user_process'}, postData));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: 'System process completed successfully',
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
    @Post('import-user-process-upload')
    async importUserProcessUpload(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.importUserRequestService.findOne({hash: postData?.id, status: '0', flage: '3', requeststep: '3'},{id: "DESC"});
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
            postData = {...postData,...{name: 'import-user-process-upload'}}
            let data = await lastValueFrom(this.client.send({cmd: 'import_user_process'}, postData));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: 'Upload process completed successfully',
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
    @Post('terminate-user-process')
    async terminateUserProcess(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.importUserRequestService.findOne({hash: postData?.id, status: '1', flage: '5', requeststep: '5', terminate_step: '0'},{id: "DESC"});
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
            postData = {...postData,...{name: 'terminate-user-process'}}
            let data = await lastValueFrom(this.client.send({cmd: 'import_user_process'}, postData));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
                message: 'Terminate process completed successfully',
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