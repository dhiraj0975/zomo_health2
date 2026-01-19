import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    CommonService, CompaniesEntity,
    SsoOrgMappingEntity, SsoToolEntity,
    Status,
    tableConstant
} from '@common-constants';
import { SsoOrgMappingDto } from "@common-constants/dto/sso";
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
    UseGuards
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { TranslationService } from "../../translation/translation.service";
import { SsoOrgMappingInput } from "./inputs";
import { CompanyService } from "@/modules/company/companies/company.service";
import { SsoOrgMappingService } from "@/modules/sso/sso-org-mapping/sso-org-mapping.service";
import { SsoToolService } from "@/modules/sso/sso-tool/sso-tool.service";
let ssoSecretKey = process.env?.SSO_SECRET_KEY_PROD?.slice(0, 32);
let ssoIv = process.env?.SSO_SECRET_KEY_PROD?.slice(0, 16);
import {SsoOrgMappingPaginateInput} from "./inputs/sso-org-mapping-paginate.input";
const path = require('path');

@Controller('sso-org-mapping')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ssoOrgMappingController {
    constructor(
        private readonly ssoOrgMappingService: SsoOrgMappingService,
        private readonly ssoToolService: SsoToolService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly companyService: CompanyService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: SsoOrgMappingPaginateInput) {
        try {
            if (![appConstant.ROLE.ORGADMIN,appConstant.ROLE.ADMIN].includes(req.tokenUser?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            postData = this.commonService.sanitizePayload(postData);
            let fields = ["ssoOrgMapping.id","ssoOrgMapping.org_id","ssoOrgMapping.tool_id","ssoOrgMapping.saml","ssoOrgMapping.field_identifier","ssoOrgMapping.status"];
            let where = `ssoOrgMapping.status != '2'`;
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            const resultedData = await this.ssoOrgMappingService.commonQueryBuilder(
                fields,
                where,
                { [`ssoOrgMapping.${orderBy}`] : order },
            [],
                'getManyAndCount',
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(SsoOrgMappingDto, resultedData['list'], req.lang)
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
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: SsoOrgMappingInput) {
        try {
            if (![appConstant.ROLE.ORGADMIN,appConstant.ROLE.ADMIN].includes(req.tokenUser?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.org_id || !postData?.tool_id || !postData.saml) {

                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let ssoToolData:SsoToolEntity = await this.ssoToolService.getOne({id: postData.tool_id},["id","tool_name","tool_detail","status"])
            if (!ssoToolData) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_SSO_TOOL_REQUIRED'));
            }
            let toolName: string = ssoToolData.tool_name;
            postData.field_identifier = JSON.parse(postData.field_identifier)
            if (ssoToolData['tool_detail']) {
                let toolDetail = ssoToolData['tool_detail'];
                let saml = JSON.parse(postData.saml)
                const postKeys = Object.keys(postData.saml);
                const hasMismatch = postKeys.some(
                    key => !Object.prototype.hasOwnProperty.call(toolDetail, key)
                );
                if (hasMismatch) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_SSO_SAML_REQUIRED'));
                }
                for (const [key, value] of saml) {
                    postData.saml[key] = await this.commonService.ssoPasswordEncrypt(value,ssoSecretKey,ssoIv)
                }
            }
            const recordDetails: SsoOrgMappingEntity | null = await this.ssoOrgMappingService.getOne({ org_id: postData?.org_id,tool_id: postData?.tool_id, status: Not(Status.Two)});
           if (recordDetails) {
               await this.ssoOrgMappingService.updateRecord({ id: recordDetails?.id },{...postData});
               this.activityLogService.create(recordDetails, postData, tableConstant.SSO.TBL_SSO_ORG_MAPPING, req.tokenUser?.id);
           } else {
               await this.ssoOrgMappingService.create({...postData});
           }
            let companyName:CompaniesEntity | null = await this.companyService.getOne({id: postData.org_id},['company_name'])

            let encryptString: string =  await this.commonService.ssoPasswordEncrypt(`${companyName}$#$${toolName}`,ssoSecretKey,ssoIv)
           let url =  `https://${process.env.DOMAIN}/sso/${encryptString}`;
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {url: url},
                message: 'success'
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: SsoOrgMappingInput) {
        try {
            if (![appConstant.ROLE.ORGADMIN,appConstant.ROLE.ADMIN].includes(req.tokenUser?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id,status: Not(Status.Two)};
            const recordDetails: SsoOrgMappingEntity | null = await this.ssoOrgMappingService.getOne(where);
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
            await this.ssoOrgMappingService.updateRecord({id: postData?.id},{status: Status.Two});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.SSO.TBL_SSO_ORG_MAPPING, req.tokenUser?.id, 'delete');
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: SsoOrgMappingInput) {
        try {
            if (![appConstant.ROLE.ORGADMIN,appConstant.ROLE.ADMIN].includes(req.tokenUser?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id,status: Not(Status.Two)};
            let resultedData:SsoOrgMappingEntity | null = await this.ssoOrgMappingService.getOne(where,["id","org_id","tool_id","saml","field_identifier","status"]);
            if (!resultedData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(SsoOrgMappingDto, resultedData, req.lang)
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
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: SsoOrgMappingPaginateInput) {
        try {
            if (![appConstant.ROLE.ORGADMIN,appConstant.ROLE.ADMIN].includes(req.tokenUser?.role_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let where = {status: Not(Status.Two)};
            let result:SsoOrgMappingEntity[]= await this.ssoOrgMappingService.getAll(where,["id","org_id","tool_id","saml","field_identifier","status"], { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(SsoOrgMappingDto, result, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
}