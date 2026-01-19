import {
    appConstant, CacheService,
    CommonArrayService,
    CommonService,
    CompanySideMenuSettingsDto,
    tableConstant
} from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Request, Response } from "express";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCompanySideMenuSettingsInput, PaginateWithCompanyInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { FrontService } from "../front/front.service";
import { SideMenuSettingsService } from "./sideMenuSettings.service";
import {MediaCategoryService} from "@/modules/mediafitness/mediacategory/mediacategory.service";
import {CompanyService} from "@/modules/company/companies/company.service";
const path = require('path');
@Controller('company/side-menu-settings')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class SideMenuSettingsController {
    constructor(
        private readonly sideMenuSettingsService: SideMenuSettingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly frontService: FrontService,
        private readonly mediaCategoryService: MediaCategoryService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly companyService: CompanyService,
        private readonly cacheService: CacheService,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = 'sideMenuSettings.status != 0 ';
            if(postData?.company_id) {
                where += ` AND sideMenuSettings.org_id = '${postData?.company_id}' `;
            }
            if (postData?.search_str) {
                where += `AND(sideMenuSettings.datasettingmenu LIKE '%${postData?.search_str}%' OR sideMenuSettings.showmenulist LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.sideMenuSettingsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompanySideMenuSettingsDto, resultedData['list'], req.lang)
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
            const where = { org_id: postData?.org_id };
            let biometricDetails: any = await this.sideMenuSettingsService.findOne(where);
            if (!biometricDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(CompanySideMenuSettingsDto, biometricDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: biometricDetails,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanySideMenuSettingsInput) {
        try {
            if (
                !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let savedData = await this.sideMenuSettingsService.save(postData);
            if(savedData){
                let sideMenuSettingObj = {
                    'showmenulist': JSON.parse(postData?.showmenulist),
                    'datasettingmenu': JSON.parse(postData?.datasettingmenu),
                }
                await this.sideMenuSettingsService.sideMenuSettingJson(sideMenuSettingObj,postData?.org_id)
            }
            let resultDetails = {
                datasettingmenu: JSON.parse(postData?.datasettingmenu),
                showmenulist: JSON.parse(postData?.showmenulist)
            }
            let fileName = `side_menu_${postData?.org_id}.json`
            let bucketFileName = `local/sidemenu/${postData?.org_id}/${fileName}`;
            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, { path: Buffer.from(JSON.stringify(resultDetails)).toString('base64'),  filename: bucketFileName, userBucket: 'public'}));
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'The Organization menu setting has been added successfully.',
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.sideMenuSettingsService.findOne(where);
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
            await this.sideMenuSettingsService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.COMPANIES.TBL_COMPANY_SIDE_MENU_SETTINGS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'The Organization menu setting has been deleted successfully.',
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCompanySideMenuSettingsInput) {
        try {
            if (
                !postData?.id && !postData?.org_id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            const recordDetails = await this.sideMenuSettingsService.findOne(where);
            if (!recordDetails) {
                await this.sideMenuSettingsService.save(
                    postData
                );
            }
            if(postData?.datasettingmenu){
                let sideMenuSettingObj = {
                    'showmenulist': JSON.parse(postData?.showmenulist),
                    'datasettingmenu': JSON.parse(postData?.datasettingmenu),
                }
                await this.sideMenuSettingsService.sideMenuSettingJson(sideMenuSettingObj,postData?.org_id)
            }
            await this.sideMenuSettingsService.update(where, postData);
            let resultDetails = {
                datasettingmenu: JSON.parse(postData?.datasettingmenu),
                showmenulist: JSON.parse(postData?.showmenulist)
            }
            let fileName = `side_menu_${postData?.org_id}.json`
            let bucketFileName = `local/sidemenu/${postData?.org_id}/${fileName}`;
            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, { path: Buffer.from(JSON.stringify(resultDetails)).toString('base64'),  filename: bucketFileName, userBucket: 'public'}));
            await this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_COMPANY_SIDE_MENU_SETTINGS, req.tokenUser?.id);
            
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'The Organization menu setting has been updated successfully.',
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { };
            let resultedData = await this.sideMenuSettingsService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(CompanySideMenuSettingsDto, resultedData, req.lang)
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
    @Post('update-sidemenu-modules')
    async updateSidemenuModules(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { };
            let resultedData = await this.sideMenuSettingsService.listRecord(where);
            for(let item of resultedData){
                let resultDetails = {
                    datasettingmenu: JSON.parse(item.datasettingmenu),
                    showmenulist: JSON.parse(item.showmenulist)
                }
                for (let i = 0; i < Object.keys(resultDetails.showmenulist).length; i++) {
                    let key = Object.keys(resultDetails.showmenulist)[i];
                    if (key == 'Plans' && resultDetails.showmenulist[key]?.['Mainmenucustomname'] == '') {
                        const dynamicDatas = {};
                        dynamicDatas[`Plans_${item.org_id}`] = 'My Plan';
                        await this.translatorService.DynamicEngJsonData('Common', item.org_id, dynamicDatas,'Edit','Menu');
                    }
                    if (key == 'Devices_Sync' && resultDetails.showmenulist[key]?.['Mainmenucustomname'] == '') {
                        const dynamicDatas = {};
                        dynamicDatas[`Devices Sync_${item.org_id}`] = 'Fitbit Sync';
                        await this.translatorService.DynamicEngJsonData('Common', item.org_id, dynamicDatas,'Edit','Menu');
                    }
                    if (key == 'Media' && resultDetails.showmenulist[key]?.['Mainmenucustomname'] == '') {
                        let checkExist = await this.mediaCategoryService.checkExists({org_id: item?.org_id, status: 1});
                        const dynamicDatas = {};
                        if (!checkExist) {
                            dynamicDatas[`${key}_${item.org_id}`] = await this.translatorService.frontendReadTranslation(req.lang,'Fitness Videos', `/LC_MESSAGES/Media/Media`,`static`);
                        } else {
                            dynamicDatas[`${key}_${item.org_id}`] = await this.translatorService.frontendReadTranslation(req.lang,'Media', `/LC_MESSAGES/Media/Media`,`static`);
                        }
                        await this.translatorService.DynamicEngJsonData('Common', item.org_id, dynamicDatas,'Edit','Menu');
                    }
                }
                let fileName = `side_menu_${item.org_id}.json`
                let bucketFileName = `local/sidemenu/${item.org_id}/${fileName}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, { path: Buffer.from(JSON.stringify(resultDetails)).toString('base64'),  filename: bucketFileName, userBucket: 'public'}));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: '',
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

    @Post('add-dynamic-side-menu-json')
    async addDynamicSideMenuJson(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let resultedData = await this.companyService.commonQueryBuilder(['companies.id'],`sideMenuSettings.id IS NULL`,{'companies.id':'DESC'},[
                    {
                        join_table: 'companies.sideMenuSettings',
                        alias: 'sideMenuSettings',
                        table: tableConstant.COMPANIES.TBL_COMPANY_SIDE_MENU_SETTINGS,
                        on_condition: `companies.id = sideMenuSettings.org_id`,
                        join_type: 'left_many',
                    }
                ],
                'getMany');
            for(let item of resultedData){
                let filePath= `/LC_MESSAGES/Common/Menu/${item?.id}/dynamic.json`;
                let dataFileRead = this.cacheService.getCache(`Locale/eng${filePath}`);
                this.cacheService.removeCache(`Locale/eng${filePath}`);
                if (!dataFileRead) {
                    let jsonData = await this.translatorService.checkBucketForFile(filePath, 'eng');
                    if (!jsonData) {
                        let sideMenuSettingObj = {
                            datasettingmenu: {},
                            showmenulist: {}
                        }
                        await this.sideMenuSettingsService.sideMenuSettingJson(sideMenuSettingObj,item?.id)
                    }
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: '',
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