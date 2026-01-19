import { appConstant, CommonArrayService, CommonFileService, CommonService, CompanySettingsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { CampaignService } from 'src/modules/campaign/campaign/campaign.service';
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { fileName, imgFilter } from "src/utils/image-upload.utils";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCompanySettingsInput, PaginateWithCompanyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { SettingsService } from "./settings.service";
const path = require('path');
@Controller('company/settings')
@UseGuards(TokenGuard, RoleGuard)
export class SettingsController {
    constructor(
        private readonly companySettingsService: SettingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
        private readonly campaignService: CampaignService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = '';
            if(postData?.company_id) {
                where = `companySettings.org_id = '${postData?.company_id}'`;
            }
            if (postData?.search_str) {
                const conditionString = `companySettings.title LIKE '%${postData?.search_str}%' OR companySettings.logo_image LIKE '%${postData?.search_str}%' OR companySettings.broker_code LIKE '%${postData?.search_str}%' OR companySettings.pre_first_login_by LIKE '%${postData?.search_str}%' OR companySettings.wellnessprog_name LIKE '%${postData?.search_str}%'`;
                where += postData?.company_id ? " AND (" + conditionString + ")" : conditionString;
            }
            const resultedData = await this.companySettingsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompanySettingsDto, resultedData['list'], req.lang)
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            let companySetting = await this.companySettingsService.findOne(where);
            if (!companySetting) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            companySetting = <any>(
                await this.commonArrayService.formatToDto(CompanySettingsDto, companySetting, req.lang)
            );
            if(companySetting && req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN && companySetting?.campaign_id){
                let campaignDetails = await this.campaignService.findOne({id: companySetting?.campaign_id, organization_id: companySetting?.org_id, status: 1},{id: 'DESC'},['campaign.id','campaign.campaign_name']);
                if(campaignDetails){
                    companySetting['campaign'] = campaignDetails;
                } else {
                    companySetting['campaign'] = null;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: companySetting,
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
    @Post('create')
    @UseInterceptors(
        FileInterceptor("logo_image", {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.COMPANY_INFO_LOGO_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanySettingsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (
                !postData?.org_id 
            ) {
                if (file && file.fieldname === 'logo_image' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData['img_area'] = 2;
            postData['health_form_mail'] = 1;
            let saveResult;
            let companyID;
            let companySettingDetails = await this.companySettingsService.findOne({ org_id: postData?.org_id });
            if(companySettingDetails){
                await this.companySettingsService.update({ id: companySettingDetails?.id, org_id: postData?.org_id },{...postData,
                    updated_by: req.tokenUser?.id,
                });
                saveResult = {
                ...companySettingDetails,
                ...Object.fromEntries(
                    Object.entries(postData).filter(
                    ([key, value]) => value !== null || companySettingDetails[key] == null
                    )
                )
                };
                const companyID = saveResult.id;
            }
            else {
                saveResult = await this.companySettingsService.save({...postData,
                    created_by: req.tokenUser?.id,
                    updated_by: req.tokenUser?.id,
                });
                companyID = saveResult.identifiers[0].id;
            }
            if (file && file.fieldname === 'logo_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `infologo/${postData?.org_id}/infologo_` + this.commonService.generateMD5(companyID.toString()) + `.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['logo_image'] = file.filename;
            }
            await this.companySettingsService.update(
                { id: companyID },
                { 
                    logo_image:  postData?.logo_image
                },
            );
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Setting Saved Successfully.',
            });
        } catch (error) {
            if (file && file.fieldname === 'logo_image' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.companySettingsService.findOne(where);
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
            await this.companySettingsService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {logo_image: recordDetails}, tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, req.tokenUser?.id, 'delete');
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Put('update')
    @UseInterceptors(
        FileInterceptor("logo_image", {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.COMPANY_INFO_LOGO_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanySettingsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            let message = `The Organization's registration information has been updated successfully.`;
            if (
                !postData?.id && !postData?.org_id
            ) {
                if (file && file.fieldname === 'logo_image' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where: object = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            const recordDetails = await this.companySettingsService.findOne(where);
            if (!recordDetails) {
                postData['health_form_mail'] = 1;
                await this.companySettingsService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            if (file && file.fieldname === 'logo_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `infologo/${postData?.org_id}/infologo_` + this.commonService.generateMD5(recordDetails.id.toString()) + `.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['logo_image'] = file.filename;
            }
            postData['img_area'] = 2;
            await this.companySettingsService.update({id : recordDetails.id}, {...postData, updated_by: req.tokenUser?.id});
            this.activityLogService.create(recordDetails, {...postData, updated_by: req.tokenUser?.id}, tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, req.tokenUser?.id);
            if(postData.hasOwnProperty('chat_type')){
                message = 'Organization chat type settings successfully changed.';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, message),
            });
        } catch (error) {
            if (file && file.fieldname === 'logo_image' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { };
            let resultedData = await this.companySettingsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanySettingsDto, resultedData, req.lang)
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
    @UseGuards(AccessGuard)
    @Post('change-chat-type')
    async chnageChatType(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (
                !postData?.id && !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.companySettingsService.update({id : postData?.id, org_id: postData?.org_id}, {chat_type: postData?.chat_type, updated_by: req.tokenUser?.id});
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
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