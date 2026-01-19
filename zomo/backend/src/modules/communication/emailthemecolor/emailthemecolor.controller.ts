import { CommonArrayService, CommonService, CompaniesDto, CompanyMetaDto, tableConstant } from '@common-constants';
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
import { CreateCommunicationEmailThemeColorInput, PaginateWithCompanyInput } from 'src/input';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { MetaService } from 'src/modules/company/meta/meta.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
@Controller('communication/email-theme-color')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class EmailThemeColorController {
    constructor(
        @Inject('COMMUNICATION_SERVICE')
        private client: ClientProxy,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly companyService: CompanyService,
        private readonly metaService: MetaService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `company.deleted = 0 `;
            if (postData?.is_testing) {
                where += `AND company.is_testing = ${postData?.is_testing}`;
            }
            if (postData?.search_str) {
                where += ` AND (company.code LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.companyService.themePpaginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompaniesDto, resultedData['list'], req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
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
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: any;
            if(postData?.org_id){
                where = postData?.org_id ? { org_id: postData?.org_id } : '';
            }
            let getThemeColorData = await this.metaService.findOne(where, ['id', 'org_id', 'newsletterthemecolors']);
            getThemeColorData = <any>(await this.commonArrayService.formatToDto(CompanyMetaDto, getThemeColorData, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: getThemeColorData,
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailThemeColorInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: any;
            if(postData?.id){
                where = postData?.id ? { id: postData?.id } : '';
            }
            let getThemeColorData = await this.metaService.findOne(where, ['id', 'org_id', 'newsletterthemecolors']);
            if (!getThemeColorData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            postData.updated_by = req.tokenUser?.id;
            await this.metaService.update(where, postData);
            this.activityLogService.create(getThemeColorData, postData, tableConstant.COMPANIES.TBL_COMPANY_META, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Theme Color successfully updated',
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
