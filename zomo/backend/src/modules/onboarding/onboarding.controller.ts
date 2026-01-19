import { TokenGuard } from '@/guard';
import { AccessFileInput } from "@/modules/user/user/input";
import { CommonArrayService, CommonService, InterlinksDto } from "@common-constants";
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards, UseInterceptors,
    ValidationPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { Request, Response } from 'express';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { InterlinksService } from "../company/interlinks/interlinks.service";
import { OnboardingGetDto } from './dto/onboarding_get.dto';
const S3_URL =  process.env.S3_URL_PROD
type StepsRecord = Record<string, { completed?: boolean } | undefined>;
type TokenUserLike = { id?: number; steps_data?: StepsRecord; [k: string]: any };

@Controller('onboarding')
export class OnboardingController {
    private readonly onboardingSteps = [
        'registration', 'login', 'verification', 'dashboard', 'dashboardImg', 'getinternalLink','company', 'email',
        'wellness', 'user', 'agreement', 'payment', 'invitation', 'onboarding', 'template', 'getZip',
    ] as const;

    private readonly prerequisites: Record<string, string | undefined> = {
        dashboard: 'verification',
        dashboardImg: 'verification',
        getinternalLink: 'verification',
        template: 'verification',
        invitation: 'user',
        onboarding: 'company',
        email: 'payment',
        getAgreement: 'user',
        getZip: 'agreement',
    };

    constructor(
        private readonly commonService: CommonService,
        private readonly activityLogService: ActivityLogService,
        @Inject('ONBOARDING_MICROSERVICE')
        private readonly onboardingMicroservice: ClientProxy,
        @Inject('POSTCODES_SERVICE')
        private client: ClientProxy,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly interlinksService: InterlinksService,
        private readonly commonArrayService: CommonArrayService,
    ) {}

    // ---------- Utilities ----------

    private getUser(req: Request): TokenUserLike {
        return (req as any).tokenUser as TokenUserLike;
    }

    private getStepsData(req: Request): StepsRecord {
        const user = this.getUser(req);
        return (user?.steps_data ?? {}) as StepsRecord;
    }

    private validateStepAccess(step: string, stepsData: StepsRecord, agreementHardGate?: boolean) {
        if (!this.onboardingSteps.includes(step as any)) {
            throw new Error('Invalid step');
        }
        if(agreementHardGate && step==='agreement'){
            step = 'getAgreement';
        }
        const required = this.prerequisites[step];
        if (required) {
            if (!stepsData[required]?.completed) {
                throw new Error(`Please complete the "${required}" step before accessing "${step}".`);
            }
            return; // if prerequisite exists, we allow access regardless of current step completed state
        }
        if (!stepsData[step]?.completed) {
            throw new Error(`Please complete the required steps first. Details will be visible afterward.`);
        }
    }

    private async sendAndMaybePdf(
        res: Response,
        cmd: string,
        payload: any,
        wantsPdf: boolean,
    ) {
        const resp = await lastValueFrom(this.onboardingMicroservice.send({ cmd }, payload));
        if (wantsPdf) {
            const buffer = Buffer.from(resp?.data?.pdfBuffer ?? '', 'base64');
            if (!Buffer.isBuffer(buffer)) {
                throw new Error(resp?.message || 'PDF generation failed');
            }
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="compliance_agreement.pdf"',
                'Content-Length': buffer.length,
            });
            return res.send(buffer);
        }
        if (!resp?.success) {
            throw new Error(resp?.message || 'Failed to fetch data');
        }
        return resp;
    }

    private async handleGetRequest(
        req: Request,
        res: Response,
        postData: OnboardingGetDto,
        stepOverride?: string,
        agreementHardGate?: boolean,
    ) {
        try {
            const step = stepOverride || postData.step || 'onboarding';
            const user = this.getUser(req);
            const stepsData = this.getStepsData(req);

            // Optional hard gate for getAgreement
            /*if (agreementHardGate) {
                if (postData?.substep === 1) {
                    if (!stepsData?.agreement?.['data']?.baa_signature) {
                        throw new Error(`Get agreement not allowed yet. BAA Signature missing. Please complete the previous steps or submit agreement.`);
                    }
                } else {
                    if (!stepsData?.agreement?.['data']?.csa_signature) {
                        throw new Error(`Get agreement not allowed yet. CSA Signature missing. Please complete the previous steps or submit agreement.`);
                    }
                }
            }else{*/
                this.validateStepAccess(step, stepsData, agreementHardGate);
            /*}*/
            console.log(step);
            if(step==='getinternalLink'){
                let resultedData: any = await this.interlinksService.listRecord({status: 1},{ ['id']: 'ASC'}, ['id','linktitle']);
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(InterlinksDto, resultedData, req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            }
            if(step==='getZip'){
                if (
                    !postData?.postcode || postData.postcode.trim().length <= 2
                ) {
                    throw new Error('Postcode should not be empty and must be longer than 2 characters.');
                }
                const dataFields = { US: 'zipcode', CA: 'postalcode' };
                const countries = ['US', 'CA'];
                const combinedResults = [];

                for (const country of countries) {
                    const key = dataFields[country];
                    const payload = { [key]: [postData?.postcode], countrycode: country };

                    const result = await lastValueFrom(this.client.send({ cmd: 'find_postcode' }, [payload]));
                    if (Array.isArray(result) && result.length > 0) {
                        combinedResults.push(...result);
                    }
                }

                if (combinedResults.length === 0) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: 'No records found matching your search.',
                    });
                }

                const { city = null, state = null, country = null } = combinedResults[0];

                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: { city, state, country },
                    message: 'success',
                });

            }
            postData.user = user;
            postData.step = step;
            postData.substep = postData?.substep ?? null;

            let cmdToSend = this.onboardingSteps.includes(step as any) ? 'onboarding' : step;
            const wantsPdf = postData?.substep != null;
            if (wantsPdf) cmdToSend = 'getAgreementPdf';

            const data = await this.sendAndMaybePdf(res, cmdToSend, postData, wantsPdf);
            if (wantsPdf) return; // already responded with PDF

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data,
                message: 'DATA_SUCCESS',
            });
        } catch (error: any) {
            // log + uniform error
            // (keep your existing activity log shape)
            this.activityLogService.error_log(
                this.getUser(req)?.id,
                (req as any)?.originalUrl,
                error?.message,
                error,
                req,
            );
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

    // ---------- Routes ----------

    @Post('getAgreement')
    @UseInterceptors(AnyFilesInterceptor())
    @UseGuards(TokenGuard)
    async onboardingProcessGetAgreement(
        @Req() req: Request,
        @Res() res: Response,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) postData: OnboardingGetDto,
    ) {
        // hard-gate: must have completed agreement once
        if (postData?.postcode == null) {
            postData.substep = 0;
        }
        return this.handleGetRequest(req, res, postData, 'agreement', true);
    }

    @Post('getZip')
    @UseInterceptors(AnyFilesInterceptor())
    @UseGuards(TokenGuard)
    async onboardingProcessgetZip(
        @Req() req: Request,
        @Res() res: Response,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) postData: OnboardingGetDto,
    ) {
        return this.handleGetRequest(req, res, postData, 'getZip', true);
    }
    @Post('get')
    @UseGuards(TokenGuard)
    async onboardingProcessGet(
        @Req() req: Request,
        @Res() res: Response,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) postData: OnboardingGetDto,
    ) {
        return this.handleGetRequest(req, res, postData);
    }

    @Post('getdashboardImg')
    @UseGuards(TokenGuard)
    async onboardingProcessGetDashboardImg(
        @Req() req: Request,
        @Res() res: Response,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) postData: OnboardingGetDto,
    ) {
        postData.step = 'dashboardImg';
        return this.handleGetRequest(req, res, postData, 'dashboardImg');
    }
    @Post('getinternalLink')
    @UseGuards(TokenGuard)
    async onboardingProcessgetinternalLink(
        @Req() req: Request,
        @Res() res: Response,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) postData: OnboardingGetDto,
    ) {
        postData.step = 'getinternalLink';
        return this.handleGetRequest(req, res, postData, 'getinternalLink');
    }
    @Post('gettemplate')
    @UseGuards(TokenGuard)
    async onboardingProcessGetTemplate(
        @Req() req: Request,
        @Res() res: Response,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) postData: OnboardingGetDto,
    ) {
        postData.step = 'template';
        return this.handleGetRequest(req, res, postData, 'template');
    }

    @Post('getinvitationmail')
    @UseGuards(TokenGuard)
    async onboardingProcessGetInvitationMail(
        @Req() req: Request,
        @Res() res: Response,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) postData: OnboardingGetDto,
    ) {
        // your original route custom step = 'email' and prereq = 'payment' retained
        postData.step = 'email';
        return this.handleGetRequest(req, res, postData, 'email');
    }
    @Post('get-file')
    @UseGuards(TokenGuard)
    async onboardingGetFile(
        @Req() req: Request,
        @Res() res: Response,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) postData: AccessFileInput,
    ) {
        try {
            if (!postData?.file) {
                throw new Error('Required field missing: file');
            }
            const file = postData?.file.includes(S3_URL.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD)) ? postData?.file.replace((S3_URL.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD)), '') : postData?.file;
            let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {
                path: postData?.file ?? file,
                userBucket: 'private'
            }));
            let result = {
                file: '',
                extention: ''
            };
            if (fileData) {
                result['file'] = file.split('/')[file.split('/').length - 1];
                result['extention'] = file.split('.')[file.split('.').length - 1];
                result['ContentType'] = fileData.ContentType;
                let encrypted = this.commonService.passwordEncrypt(fileData.Body?.type == 'Buffer' ? Buffer.from(fileData.Body.data).toString('base64') : fileData.Body);
                result['encrypted'] = encrypted;
            }


            if (result.file == '' && result.extention == '') {
                result['message'] = 'No file found';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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