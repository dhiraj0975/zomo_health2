import {
    BiometricHealthRequestEntity,
    HealthRequestEntity,
    Status,
    tableConstant,
    WeightRequestEntity
} from "@common-constants";
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
import { CustomPointService } from "../../campaign/custompoint/custompoint.service";
import { HealthRequestService } from "../../challenge/healthrequest/healthrequest.service";
import { ActivityLogService } from "../activitylog/activitylog.service";
import {WeightRequestService} from "../../challenge/weight-request/weight-request.service";
import {BiometricHealthRequestService} from "@/modules/healthcheckup/health-request/biometric-health-request.service";
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
@Controller('custom-point')
export class CustomPointController {
    constructor(
        @Inject('CRON_SERVICE')
        private client: ClientProxy,
        private readonly customPointService: CustomPointService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly healthRequestService: HealthRequestService,
        private readonly weightRequestService: WeightRequestService,
        private readonly biometricHealthRequestService: BiometricHealthRequestService,
    ) {}
    @Post('import-custom-point')
    async importUserProcess(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING")
                });
            }
            const where = { hash: postData?.id, org_id: req.tokenUser?.org_id, created_by: req.tokenUser?.id, status: 3 };
            let recordDetails: any = await this.customPointService.requestFindOne(where,['custompointrequest.id','custompointrequest.org_id','custompointrequest.original_file','custompointrequest.campaign_id','custompointrequest.org_sheet_header','custompointrequest.mapped_header','custompointrequest.status','custompointrequest.created_by']);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            }
            if (postData?.count > 700) {
                let uploadStopRequest = await this.customPointService.requestUpdate(`created < NOW() - INTERVAL 2 HOUR  AND total_download < 4 AND status = 5`,{ status: 0, total_download: () => 'total_download + 1' });
                const joinTableList = [{'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = custompointrequest.org_id` , 'connect' : 'custompointrequest', 'type' : 'LEFT' }];
                let getlatestRequest = await this.customPointService.requestFindOne(`custompointrequest.status = 3 AND company.status = 1 AND company.deleted = 0`, ['custompointrequest','company.id','company.company_name'],joinTableList);
                if(getlatestRequest){
                    let response = await lastValueFrom(this.client.send({cmd: 'point_upload'}, { data: getlatestRequest }));
                    /*let updateInprogressStatus = await this.customPointService.requestUpdate({ id: getlatestRequest['id'] },{ status: 5 });
                    this.activityLogService.create(getlatestRequest, { status: 5 }, tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT_REQUEST, req.tokenUser?.id,'update');
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                         success: 1,
                        error: 0,
                         data: null,
                         message: await this.translatorService.frontendReadTranslation(req?.lang, "MSG_CUSTOM_POINT_IN_PROGRESS")
                     });
                    */
                    /* below condition for testing purpose add in short time*/
                    if (response?.activity == 1) {
                        this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, response?.message, '', req);
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 0,
                            error: 1,
                            data: null,
                            message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_SOMETHING_WENT_WRONG"),
                        });
                    } else if (response?.error == 0) {
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: null,
                            message: await this.translatorService.frontendReadTranslation(req?.lang, response?.message),
                        });
                    } else {
                        return res.status(HttpStatus.BAD_REQUEST).json({
                            success: 0,
                            error: 1,
                            data: null,
                            message: await this.translatorService.frontendReadTranslation(req?.lang, response?.message)
                        });
                    }
                    /* above condition for testing purpose add in short time*/
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND"));
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "MSG_CUSTOM_POINT_IN_PROGRESS"),
                });
            } else {
                let response = await lastValueFrom(this.client.send({cmd: 'point_upload'}, { data: recordDetails }));
                if (response?.activity == 1) {
                    this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, response?.message, JSON.stringify({stack:response}), req);
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_SOMETHING_WENT_WRONG"),
                    });
                } else if (response?.error == 0) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, response?.message),
                    });
                } else {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, response?.message)
                    });
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

    @Post('import-miles-custom-point')
    async importMilesUserProcess(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.hash) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING")
                });
            }
            const where = { hash: postData?.hash, org_id: req.tokenUser?.org_id, created_by: req.tokenUser?.id, status: 3 };
            let recordDetails: HealthRequestEntity = await this.healthRequestService.findOne(where,['id','schedule_id','org_id','origional_file','org_sheet_header','mapped_header','status','created_by']);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            }
            if (postData?.count > 700) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "MSG_CUSTOM_POINT_IN_PROGRESS"),
                });
            } else {
                let response = await lastValueFrom(this.client.send({cmd: 'miles_point_upload'}, { data: recordDetails }));
                if (response?.activity == 1) {
                    this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, response?.message, JSON.stringify({stack:response}), req);
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_SOMETHING_WENT_WRONG"),
                    });
                } else if (response?.error == 0) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, response?.message),
                    });
                } else {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, response?.message)
                    });
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

    @Post('import-weight-custom-point')
    async importWeightUserProcess(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.hash || !postData?.count) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING")
                });
            }
            const where = { hash: postData?.hash, created_by: req.tokenUser?.id, status: Status.Three };
            let recordDetails: WeightRequestEntity | null = await this.weightRequestService.getOne(where,['id','org_id','original_file','org_sheet_header','mapped_header','status','created_by']);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            }
            if (postData?.count > 700) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "MSG_CUSTOM_POINT_IN_PROGRESS"),
                });
            } else {
                let response = await lastValueFrom(this.client.send({cmd: 'weight_point_upload'}, { data: recordDetails }));
                if (response?.activity == 1) {
                    this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, response?.message, JSON.stringify({stack:response}), req);
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_SOMETHING_WENT_WRONG"),
                    });
                } else if (response?.error == 0) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, response?.message),
                    });
                } else {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, response?.message)
                    });
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

    @Post('import-biometric-health-request')
    async importBiometricHealthRequest(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.hash || !postData?.count) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING")
                });
            }
            const where = { hash: postData?.hash, status: Status.Three };
            let recordDetails: BiometricHealthRequestEntity | null = await this.biometricHealthRequestService.getOne(where,['id','original_file','org_sheet_header','mapped_header','status']);
            console.log("recordDetails",recordDetails);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            }
            if (postData?.count > 700) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req?.lang, "MSG_CUSTOM_POINT_IN_PROGRESS"),
                });
            } else {
                let response = await lastValueFrom(this.client.send({cmd: 'biometric_health_request'}, { data: recordDetails }));
                console.log("response",response);
                if (response?.activity == 1) {
                    this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, response?.message, JSON.stringify({stack:response}), req);
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_SOMETHING_WENT_WRONG"),
                    });
                } else if (response?.error == 0) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, response?.message),
                    });
                } else {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, response?.message)
                    });
                }

            }
        } catch (error) {
            console.log("error",error);
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
