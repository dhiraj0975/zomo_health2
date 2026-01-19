import {
    appConstant,
    CommonArrayService,
    CommonFileService,
    CommonService,
    SsoOrgMappingEntity,
    SsoToolEntity,
    Status,
    tableConstant
} from '@common-constants';
import {Body, Controller, HttpException, HttpStatus, Inject, Post, Put, Req, Res, UseGuards,} from '@nestjs/common';
import {Request, Response} from "express";
import {ActivityLogService} from 'src/modules/master/activitylog/activitylog.service';
import {Not} from "typeorm";
import {AccessGuard, RoleGuard, TokenGuard} from '../../../guard';
import {TranslationService} from "../../translation/translation.service";
import {SsoOrgMappingService} from "@/modules/sso/sso-org-mapping/sso-org-mapping.service";
import {SsoToolDto} from "@common-constants/dto/sso";
import {SsoToolInput} from "./inputs";
import {SsoToolService} from "@/modules/sso/sso-tool/sso-tool.service";

@Controller('sso-tool')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class ssoToolController {
    constructor(
        private readonly ssoOrgMappingService: SsoOrgMappingService,
        private readonly ssoToolService: SsoToolService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
    ) {}

    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: SsoToolInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.tool_name || !postData?.tool_detail) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let checkExist: boolean = await this.ssoToolService.checkExists({tool_name: postData?.tool_name,status: Not(Status.Two)});
            if (checkExist) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_SSO_TOOL_EXIST")
                });
            }
            await this.ssoToolService.create({...postData});
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: SsoToolInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData.id || !postData?.tool_name || !postData?.tool_detail) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let checkExist: boolean = await this.ssoToolService.checkExists({tool_name: postData?.tool_name,status: Not(Status.Two)});
            if (checkExist) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: 0,
                    error: 1,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_SSO_TOOL_EXIST")
                });
            }
            const recordDetails: SsoToolEntity | null = await this.ssoToolService.getOne({ id: postData?.id,status: Not(Status.Two) });
            await this.ssoToolService.updateRecord({ id: postData?.id },{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.SSO.TBL_SSO_TOOL, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Success"),
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: SsoToolInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id,status: Not(Status.Two)};
            const recordDetails: SsoToolEntity | null = await this.ssoToolService.getOne(where);
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
            await this.ssoToolService.updateRecord({id: postData?.id},{status: Status.Two});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.SSO.TBL_SSO_TOOL, req.tokenUser?.id, 'delete');
            let ssoOrgMappingList:SsoOrgMappingEntity[] = await this.ssoOrgMappingService.getAll({tool_id: postData?.id,status: Not(Status.Two)})
            if (ssoOrgMappingList.length > 0) {
                await this.ssoOrgMappingService.updateRecord({tool_id: postData?.id,status: Not(Status.Two)},{status: Status.Two})
                this.activityLogService.create(ssoOrgMappingList, {status:2}, tableConstant.SSO.TBL_SSO_ORG_MAPPING, req.tokenUser?.id, 'delete');
            }
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: SsoToolInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let where = {id: postData?.id,status: Not(Status.Two)};
            let resultedData:SsoToolEntity | null = await this.ssoToolService.getOne(where,["id","tool_name","tool_detail","status"]);
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
                await this.commonArrayService.formatToDto(SsoToolDto, resultedData, req.lang)
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: SsoToolInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let where = {status: Not(Status.Two)};
            let result:SsoToolEntity[]= await this.ssoToolService.getAll(where,["id","tool_name","tool_detail","status"], { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(SsoToolDto, result, req.lang)
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