import { CommonArrayService, KeyContactsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Req,
    Res,
    UseGuards
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { KeyContactInput } from "../../../input";
import { CompanyService } from "../companies/company.service";
import { KeyContactService } from "./keycontact.service";
@Controller('keycontact')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class KeyContactController {
    constructor(
        private readonly keyContactService: KeyContactService,
        private readonly companyService: CompanyService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    /*
     * Function to get details of key contact
     * - company_id is mandatory params
     */
    @Post('get')
    async get(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const findCompany = await this.companyService.findOneV1({ id: postData?.company_id, status: 1, deleted: 0 },[],['company.id','company.status']);
            if (!findCompany) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            let contactDetails = await this.keyContactService.findOne({
                company_id: postData?.company_id,
            });
            if (!contactDetails) {
                contactDetails = <any>{
                    hr_pri_contact: null,
                    hr_contact: null,
                    hr_email: null,
                    tech_contact: null,
                    tech_email: null,
                    tobacco_contact: null,
                    tobacco_email: null,
                };
            }
            contactDetails = <any>(
                await this.commonArrayService.formatToDto(KeyContactsDto, contactDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: contactDetails,
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
    /*
     * Use to create/update key contact
     * - company_id is mandatory params
     */
    @Post('set')
    async set(@Req() req: Request, @Res() res: Response, @Body() postData: KeyContactInput) {
        try {
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const findCompany = await this.companyService.findOneV1({ id: postData?.company_id, status: 1, deleted: 0 },[],['company.id','company.status']);
            if (!findCompany) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            const contactDetails = await this.keyContactService.findOne({ company_id: postData?.company_id });
            if (contactDetails) {
                await this.keyContactService.update(
                    { id: contactDetails.id },
                    {
                        updated_by: req.tokenUser?.id,
                        ...postData
                    },
                );
                this.activityLogService.create(contactDetails, { updated_by: req.tokenUser?.id,...postData }, tableConstant.COMPANIES.TBL_KEY_CONTACT, req.tokenUser?.id);
            } else {
                await this.keyContactService.save({
                    created_by: req.tokenUser?.id,
                    ...postData
                });
            }
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
}
