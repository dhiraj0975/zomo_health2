import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { TokenGuard } from '@/guard';
import { appConstant, CommonFileService, CommonService, CommonDateService } from '@common-constants';
import { diskStorage } from 'multer';
import { fileNameUUID, imgFilter } from '@/utils/image-upload.utils';
import { CompanySetupDto } from './dto/company-setup.dto';
import { WellnessDto } from './dto/wellness.dto';
import { UserImportDto } from './dto/user-import.dto';
import { AgreementDto } from './dto/agreement.dto';
import { PaymentDto } from './dto/payment.dto';
import { InvitationDto } from './dto/invitation.dto';
import { VerificationCompanyDto } from './dto/verification-company.dto';

const path = require('path');

type StepsRecord = Record<string, { completed?: number | boolean } | undefined>;
type TokenUserLike = { id: number; steps_data?: StepsRecord; [k: string]: any };

@Controller('onboarding/company')
@UseGuards(TokenGuard)
export class CompanyController {
    constructor(
        private readonly activityLogService: ActivityLogService,
        @Inject('ONBOARDING_MICROSERVICE')
        private readonly onboardingMicroservice: ClientProxy,
        private readonly commonFileService: CommonFileService,
        private readonly commonService: CommonService,
        private readonly commonDateService: CommonDateService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        @Inject('POSTCODES_SERVICE')
        private client: ClientProxy,
    ) {}

    // ---------- Utilities ----------

    private user(req: Request): TokenUserLike {
        return (req as any).tokenUser as TokenUserLike;
    }
    private steps(req: Request): StepsRecord {
        return this.user(req)?.steps_data ?? {};
    }

    private async validateDto<T extends object>(dtoClass: new () => T, data: any) {
        const dto = plainToInstance(dtoClass, data);
        const errors = await validate(dto, { whitelist: true, forbidUnknownValues: false });
        if (errors.length > 0) {
            const messages = errors
                .map((e) => Object.values(e.constraints || {}).join(', '))
                .join('; ');
            throw new HttpException(messages, HttpStatus.BAD_REQUEST);
        }
    }

    private requirePrev(step: string, prev: string, req: Request) {
        const s = this.steps(req);
        if (!s?.[prev]?.completed) {
            throw new Error(`step '${step}' not allowed yet. Please complete the previous steps first.`);
        }
    }

    private forbidIfCompleted(step: string, req: Request) {
        const s = this.steps(req);
        if (s?.[step]?.completed) {
            throw new Error(`already completed step: ${step}`);
        }
    }

    private async send(cmd: string, payload: any) {
        const response = await lastValueFrom(this.onboardingMicroservice.send({ cmd }, payload));
        if (!response?.success && cmd !== 'payment') {
            // payment flow below continues even when success is handled differently
            throw new Error(response?.message || 'Operation failed');
        }
        return response;
    }

    private ok(res: Response, data: any, message: string) {
        return res.status(HttpStatus.OK).json({
            statusCode: 200,
            success: 1,
            error: 0,
            data,
            message,
        });
    }

    // ---------- Routes ----------

    @Post('verification')
    @UseInterceptors(AnyFilesInterceptor())
    async userVerification(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: VerificationCompanyDto,
    ) {
        try {
            await this.validateDto(VerificationCompanyDto, postData);
            postData.user = this.user(req);
            const data = await this.send('verification-company', postData);
            return this.ok(res, data, 'USER_VERIFICATION_SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }

    @Post('registration')
    @UseInterceptors(AnyFilesInterceptor({
        limits: { fileSize: appConstant.FILE_SIZE },
        storage: diskStorage({
            destination: `${appConstant.COMPANY_DASHBOARD}`,
            filename: fileNameUUID,
        }),
        fileFilter: imgFilter,
    }))
    async companySetup(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CompanySetupDto,
        @UploadedFiles() files: Record<string, any>,
    ) {
        try {
            const isPostDataEmpty = !postData || Object.keys(postData).length === 0;
            const isFilesEmpty = !files || Object.keys(files).length === 0;

            if (isPostDataEmpty && isFilesEmpty) {
                return this.fail(req, new Error("No valid data or files uploaded. Please provide at least some data or upload files."));
            }
            const onboardingID = this.user(req).id;
            postData.step = 'company';
            postData.user = this.user(req);

            this.requirePrev('company', 'verification', req);
            this.forbidIfCompleted('payment', req);

            await this.validateDto(CompanySetupDto, postData);

            if (files && Object.keys(files).length > 0) {
                const all = Array.isArray(files) ? files : Object.values(files).flat();
                await this.handleFileUploads(all, onboardingID, postData);
            }

            /*if (!postData.company_logo) {
                throw new Error('Company logo is required. Please upload a valid image file (JPG, PNG, SVG)');
            }*/

            postData.company_name = postData?.company_name?.trim();
            postData.completed = Number(this.user(req).steps_data?.company?.completed ?? 0);

            const data = await this.send('company', postData);
            return this.ok(res, data, 'COMPANY_SETUP_SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }

    @Post('companyverify')
    async companyverify(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CompanySetupDto,
    ) {
        try {
            const s = this.steps(req);
            postData.step = 'company';
            postData.user = this.user(req);

            // forbid if already completed
            this.forbidIfCompleted('company', req);

            const requiredFields = [
                'company_name',
                'company_logo',
                'street_address',
                'phone',
                'email',
                'theme_color',
                'dashboard_data',
            ];
            interface CompanyStep {
                completed?: boolean;
                data?: {
                    company_name: string;
                    company_logo: string;
                    street_address: string;
                    phone: string;
                    email: string;
                    theme_color: string;
                    dashboard_data?: {
                        square_img: string;
                        mob_square_img: string;
                        square_img_link_isin: 0 | 1;
                        square_img_link_id?: number;
                        square_img_link?: string;
                    }[];
                };
            }
            const company = (s?.company as CompanyStep)?.data;

            const allFieldsPresent = !!company &&
                requiredFields.every(field => company[field as keyof typeof company] != null);

            const isDashboardDataValid = Array.isArray(company?.dashboard_data) &&
                company.dashboard_data.every(item => {
                    const hasValidImages =
                        item.square_img?.trim() &&
                        item.mob_square_img?.trim();

                    const hasValidLinkSetting =
                        item.square_img_link_isin === 0 || item.square_img_link_isin === 1;

                    const isLinkValid =
                        (item.square_img_link_isin === 0 &&
                            item.square_img_link_id !== undefined &&
                            Number(item.square_img_link_id) > 0) ||
                        (item.square_img_link_isin === 1 &&
                            typeof item.square_img_link === 'string' &&
                            item.square_img_link.trim() !== '');

                    return hasValidImages && hasValidLinkSetting && isLinkValid;
                });
            if (allFieldsPresent && isDashboardDataValid) {
                postData.completed = 1;
            }else{
                throw new Error('Step company verify not allowed yet. Please complete the previous steps first.');
            }
            const data = await this.send('company', postData);
            return this.ok(res, data, 'SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }

    @Post('wellness')
    @UseInterceptors(AnyFilesInterceptor())
    async wellnessSetup(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: WellnessDto,
    ) {
        try {
            const isPostDataEmpty = !postData || Object.keys(postData).length === 0;

            if (isPostDataEmpty) {
                return this.fail(req, new Error("No valid data. Please provide at least some data"));
            }

            postData.step = 'wellness';
            postData.user = this.user(req);

            this.requirePrev('wellness', 'company', req);
            this.forbidIfCompleted('payment', req);

            await this.validateDto(WellnessDto, postData);

            postData.completed = Number(this.user(req).steps_data?.wellness?.completed ?? 0);
            const data = await this.send('wellness', postData);
            return this.ok(res, data, 'WELLNESS_SETUP_SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }

    @Post('wellnessverify')
    async wellnessverify(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: WellnessDto,
    ) {
        try {
            const s = this.steps(req);
            postData.step = 'wellness';
            postData.user = this.user(req);

            // forbid if already completed
            this.forbidIfCompleted('wellness', req);

            const requiredFields = [
                'campaign_name',
                'start_date',
                'end_date',
                'activity_data',
                'rewards',
            ];
            interface WellnessStep {
                completed?: boolean;
                data?: {
                    campaign_name: string;
                    activity_data?: { activity_id: number | string }[];
                    rewards?: { cust_name: string; amt_user: number | string }[];
                };
            }
            const wellness = (s?.wellness as WellnessStep)?.data;
            const allFieldsPresent = !!wellness &&
                requiredFields.every(field => wellness[field as keyof typeof wellness] != null);

            const isActivityDataValid = Array.isArray(wellness?.activity_data) &&
                wellness.activity_data.every(item =>
                    Number(item.activity_id) > 0
                );

            const isRewardsDataValid = Array.isArray(wellness?.rewards) &&
                wellness.rewards.every(item =>
                    item.cust_name?.trim() &&
                    Number(item.amt_user) > 0
                );
            if (allFieldsPresent && isActivityDataValid && isRewardsDataValid) {
                postData.completed = 1;
            }else{
                throw new Error('Step wellness verify not allowed yet. Please complete the previous steps first.');
            }
            const data = await this.send('wellness', postData);
            return this.ok(res, data, 'SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }

    @Post('uservalidate')
    @UseInterceptors(AnyFilesInterceptor({
        limits: { fileSize: appConstant.FILE_SIZE },
        storage: diskStorage({
            destination: `${appConstant.COMPANY_DASHBOARD}`,
            filename: fileNameUUID,
        }),
        fileFilter: imgFilter,
    }))
    async userImportValidate(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: UserImportDto,
        @UploadedFiles() files: Record<string, any>,
    ) {
        try {
            const onboardingID = this.user(req).id;
            postData.step = 'user';
            postData.user = this.user(req);

            this.requirePrev('user', 'wellness', req);
            this.forbidIfCompleted('payment', req);

            await this.validateDto(UserImportDto, postData);

            if (files && Object.keys(files).length > 0) {
                const all = Array.isArray(files) ? files : Object.values(files).flat();
                await this.handleFileUploads(all, onboardingID, postData);
            }
            if (!postData.origional_file) {
                throw new Error('Original file must be an Excel or CSV file. Please select .xls, .xlsx or .csv file types only.');
            }

            //postData.completed = 0;
            const data = await this.send('user', postData);
            return this.ok(res, data, 'USER_IMPORT_SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }

    @Post('userverify')
    async userImport(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: UserImportDto,
    ) {
        try {
            const s = this.steps(req);
            postData.step = 'user';
            postData.user = this.user(req);

            // forbid if already completed
            this.forbidIfCompleted('user', req);

            // must have wellness complete and user step currently == 0 (validated but not finalized)
            if (
                !s?.wellness?.completed ||
                s?.user?.completed !== 0 ||
                !s?.user?.['data']?.successCount
            ) {
                throw new Error(
                    !s?.user?.['data']?.successCount
                        ? 'At least one success record is required for submission.'
                        : s?.user?.completed !== 0
                            ? 'Please complete user verification first.'
                            : 'Step user verify not allowed yet. Please complete the previous steps first.'
                );
            }


            postData.completed = 1;
            const data = await this.send('user', postData);
            return this.ok(res, data, 'USER_IMPORT_SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }

    @Post('invitationskip')
    async invitationSkip(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: UserImportDto,
    ) {
        try {
            const s = this.steps(req);
            postData.step = 'invitation';
            postData.user = this.user(req);

            // forbid if already completed
            this.forbidIfCompleted('invitation', req);

            if (!s?.payment?.completed) {
                throw new Error('Step invitation verify not allowed yet. Please complete the previous steps first.');
            }
            postData.completed = 1;
            const data = await this.send('invitation', postData);
            return this.ok(res, data, 'INVITATION_SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }
    @Post('agreement')
    @UseInterceptors(AnyFilesInterceptor())
    async agreementSetup(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: AgreementDto,
    ) {
        try {
            const isPostDataEmpty = !postData || Object.keys(postData).length === 0;

            if (isPostDataEmpty) {
                return this.fail(req, new Error("No valid data. Please provide at least some data"));
            }
            postData.step = 'agreement';
            postData.user = this.user(req);

            this.requirePrev('agreement', 'user', req);
            this.forbidIfCompleted('payment', req);

            await this.validateDto(AgreementDto, postData);

            /*postData.completed = 1;*/
            const data = await this.send('agreement', postData);
            return this.ok(res, data, 'AGREEMENT_SETUP_SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }

    @Post('paymentverify')
    async paymentverify(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: UserImportDto,
    ) {
        try {
            const s = this.steps(req);
            postData.step = 'payment';
            postData.user = this.user(req);

            // forbid if already completed
            this.forbidIfCompleted('payment', req);

            interface PaymentStep {
                completed?: boolean;
                data?: {
                    payment_method: string;
                    amount: number;
                    contact_email: string;
                };
            }

            const payment = (s?.payment as PaymentStep)?.data;

            const isValidPayment =
                !!payment?.payment_method?.trim() &&
                typeof payment.amount === 'number' &&
                payment.amount > 0 &&
                !!payment.contact_email?.trim();

            if (!isValidPayment) {
                throw new Error('Step payment verify not allowed yet. Please complete the required fields.');
            }
            await lastValueFrom(this.onboardingMicroservice.send({ cmd: 'addDashboardData' }, postData));
            await lastValueFrom(this.onboardingMicroservice.send({ cmd: 'addIncentiveData' }, postData));
            await lastValueFrom(this.onboardingMicroservice.send({ cmd: 'addUserData' }, postData));
            postData.completed = 1;
            const data = await this.send('payment', postData);
            return this.ok(res, data, 'SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }
    @Post('payment')
    @UseInterceptors(AnyFilesInterceptor())
    async paymentSetup(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: PaymentDto,
    ) {
        try {
            const isPostDataEmpty = !postData || Object.keys(postData).length === 0;

            if (isPostDataEmpty) {
                return this.fail(req, new Error("No valid data. Please provide at least some data"));
            }
            postData.step = 'payment';
            postData.user = this.user(req);

            this.requirePrev('payment', 'agreement', req);
            this.forbidIfCompleted('payment', req);

            await this.validateDto(PaymentDto, postData);

            if (postData.billing_zip && postData.billing_zip.trim().length >= 3) {
                const dataFields = { US: 'zipcode', CA: 'postalcode' };
                const countries = ['US', 'CA'];
                const combinedResults = [];

                for (const country of countries) {
                    const key = dataFields[country];
                    const payload = { [key]: [postData.billing_zip.trim()], countrycode: country };

                    const result = await lastValueFrom(
                        this.client.send({ cmd: 'find_postcode' }, [payload])
                    );

                    if (Array.isArray(result) && result.length > 0) {
                        combinedResults.push(...result);
                    }
                }

                if (combinedResults.length === 0) {
                    throw new Error('No matching postcode found for the provided billing zip in US or CA.');
                }

                const { city = null, state = null, country = null } = combinedResults[0];
                postData.city = city;
                postData.state = state;
                postData.country = country;
            }

            // Your original flow: do payment, then addIncentiveData & addUserData if success
            const paymentResp = await lastValueFrom(
                this.onboardingMicroservice.send({ cmd: 'payment' }, postData),
            );

            return this.ok(res, paymentResp, 'PAYMENT_SETUP_SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }

    @Post('invitation')
    @UseInterceptors(AnyFilesInterceptor({
        limits: { fileSize: appConstant.FILE_SIZE },
        storage: diskStorage({
            destination: `${appConstant.COMPANY_DASHBOARD}`,
            filename: fileNameUUID,
        }),
        fileFilter: imgFilter,
    }))
    async invitationSetup(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: InvitationDto,
        @UploadedFiles() files: Record<string, any>,
    ) {
        try {
            //console.log('sss',files);
            //return;
            postData.step = 'invitation';
            postData.user = this.user(req);
            const onboardingID = this.user(req).id;
            this.requirePrev('invitation', 'payment', req);
            this.forbidIfCompleted('invitation', req);

            await this.validateDto(InvitationDto, postData);
            if (files && Object.keys(files).length > 0) {
                const all = Array.isArray(files) ? files : Object.values(files).flat();
                await this.handleFileUploads(all, onboardingID, postData);
            }
            /*postData.completed = 1;*/
            const data = await this.send('invitation', postData);
            return this.ok(res, data, 'INVITATION_SETUP_SUCCESS');
        } catch (error: any) {
            return this.fail(req, error);
        }
    }

    // ---------- Shared helpers (kept from your file, slightly tidied) ----------

    flattenValidationErrors(errors: ValidationError[]): string[] {
        const messages: string[] = [];
        for (const err of errors) {
            if (err.constraints) messages.push(...Object.values(err.constraints));
            if (err.children?.length) messages.push(...this.flattenValidationErrors(err.children));
        }
        return messages;
    }

    async handleFileUploads(files: any[], onboardingID: number, postData: any) {
        if (!files?.length) return;

        const timestamp = this.commonDateService.getTodayDate().unix();
        const hashed = this.commonService.generateMD5(onboardingID.toString());

        for (const file of files) {
            const ext = (file.originalname.split('.').pop() || '').toLowerCase();

            if (file.fieldname === 'company_logo') {
                const finalFileName = `companylogos/onboarding/${onboardingID}/orginallogo/comimg_${hashed}${timestamp}.${ext}`;
                await lastValueFrom(
                    this.commonMicroservice.send({ cmd: 'upload_file' }, {
                        path: path.resolve(file.path),
                        filename: finalFileName,
                    }),
                );
                postData.company_logo = path.basename(finalFileName);
            }

            if (file.fieldname.startsWith('dashboard_data')) {
                const match = file.fieldname.match(/dashboard_data\[(\d+)]\[(.+)]/);
                if (match) {
                    const index = parseInt(match[1], 10);
                    const key = match[2];
                    if (!postData.dashboard_data) postData.dashboard_data = [];
                    if (!postData.dashboard_data[index]) postData.dashboard_data[index] = {};
                    const finalFileName = `dashboardimages/onboarding/${onboardingID}/${key}_${hashed}${timestamp}.${ext}`;
                    await lastValueFrom(
                        this.commonMicroservice.send({ cmd: 'upload_file' }, {
                            path: path.resolve(file.path),
                            filename: finalFileName,
                        }),
                    );
                    postData.dashboard_data[index][key] = finalFileName;
                }
            }
            if (file.fieldname.startsWith('attachment')) {
                //const match = file.fieldname.match(/attachment\[(\d+)]\[(.+)]/);
                const match = file.fieldname.match(/^attachment\[(\d+)]$/);
                if (match) {
                if (!postData.attachment) postData.attachment = [];
                if (!postData.attachment_local) postData.attachment_local = [];
                const finalFileName = `comwelattch/${onboardingID}/${file.originalname.split('.')[0]}_${timestamp}.${ext}`;
                    await lastValueFrom(
                        this.commonMicroservice.send({ cmd: 'upload_file' }, {
                            path: path.resolve(file.path),
                            filename: finalFileName,
                            isRemove: false,
                        })
                    );
                    postData.attachment.push(finalFileName);
                //postData.attachment_local.push({path: path.resolve(file.path),filename: file.originalname});
                postData.attachment_local.push({ path: path.resolve(file.path), filename: file.originalname });
                }
                //console.log('postData',postData);
            }
            if (file.fieldname === 'origional_file') {
                const finalFileName = `userimport/onboarding/${onboardingID}/origional_file_${hashed}${timestamp}.${ext}`;
                const finalFileNamejson = `userimport/onboarding/${onboardingID}/validation_file_${hashed}${timestamp}.json`;

                const fileExt = (file.originalname.split('.').pop() || '').toLowerCase();
                let filePath = '';
                let excelData: any = { status: 0, message: 'UNKNOWN_ERROR' };

                if (fileExt === 'csv') {
                    excelData = await this.commonFileService.createFileToJson(path.resolve(file.path), 'csv_to_json.py');
                    filePath = file.path.replace(/\.csv$/i, '.json');
                } else {
                    excelData = await this.commonFileService.createFileToJson(path.resolve(file.path), 'excel_to_json.py');
                    filePath = file.path.replace(/\.xlsx?$/i, '.json');
                }

                if (excelData?.status === 0) {
                    throw new Error(excelData?.message || 'Error processing the uploaded file. Please ensure it is a valid Excel or CSV file.');
                }

                await lastValueFrom(
                    this.commonMicroservice.send({ cmd: 'upload_file' }, {
                        path: path.resolve(file.path),
                        filename: finalFileName,
                        userBucket: 'private',
                    }),
                );
                postData.origional_file = finalFileName;

                await lastValueFrom(
                    this.commonMicroservice.send({ cmd: 'upload_file' }, {
                        path: path.resolve(filePath),
                        filename: finalFileNamejson,
                        userBucket: 'private',
                    }),
                );
                postData.validation_file = finalFileNamejson;
            }
        }
    }

    private fail(req: Request, error: any): never {
        // centralize uniform failure with activity log
        this.activityLogService.error_log(
            this.user(req)?.id,
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