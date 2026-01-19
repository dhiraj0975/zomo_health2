import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, CompanyDashboardDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import {
    AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import { lastValueFrom } from "rxjs";
import { UrlManageService } from 'src/modules/common';
import { DocumentService } from "src/modules/datamanagement/document/document.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { LanguagesService } from "src/modules/master/languages/languages.service";
import { UserService } from "src/modules/user/user/user.service";
import {In, Like, Not} from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { fileNameUUID, imgFilter } from '../../../utils/image-upload.utils';
import { TranslationService } from "../../translation/translation.service";
import { CompanyService } from "../companies/company.service";
import { DepartmentService } from "../departments/department.service";
import { InterlinksService } from "../interlinks/interlinks.service";
import { LocationService } from "../locations/location.service";
import { SettingsService } from "../settings/settings.service";
import { WellnessAssignmentService } from "../wellnessassignment/wellnessAssignment.service";
import { DashboardService } from "./dashboard.service";
import { DashboardClickService } from './dashboard-click.service';
import { CreateCompanyDashboardInput, PaginateCompanyDashboardInput, stockImagesInput } from './input';
import {CreatebillboardclickInput} from "@/input";

const S3_URL =  process.env.S3_URL_PROD
const path = require('path');
const moment = require('moment-timezone');
@Controller('company/dashboard')
@UseGuards(TokenGuard, RoleGuard)
export class dashboardsController {
    constructor(
        private readonly dashboardService: DashboardService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly companySettingsService: SettingsService,
        private readonly locationService: LocationService,
        private readonly departmentService: DepartmentService,
        private readonly activityLogService: ActivityLogService,
        private readonly companyService: CompanyService,
        private readonly userService: UserService,
        private readonly wellnessAssignmentService: WellnessAssignmentService,
        private readonly languagesService: LanguagesService,
        private readonly documentService: DocumentService,
        private readonly interlinksService: InterlinksService,
        private readonly urlManageService: UrlManageService,
        private readonly dashboardClickService: DashboardClickService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateCompanyDashboardInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = 'dashboard.status != 0';
            if(postData?.org_id) {
                where += `AND(dashboard.org_id = '${postData?.org_id}') `;
            }
            if(postData?.added_by) {
                where += `AND(dashboard.added_by = '${postData?.added_by}') `;
            }
            if(postData?.reference_id) {
                where += `AND(dashboard.added_by = '${postData?.reference_id}') `;
            }
            if (postData?.search_str) {
                where += `AND(dashboard.square_img LIKE '%${postData?.search_str}%' OR dashboard.square_img_link LIKE '%${postData?.search_str}%' OR dashboard.square_img_link_isin LIKE '%${postData?.search_str}%' OR dashboard.square_img_link_id LIKE '%${postData?.search_str}%' OR dashboard.mob_square_img LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.dashboardService.paginateList(
                where,
                postData
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CompanyDashboardDto, resultedData['list'], req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.org_id ? { id: postData?.id, org_id: postData?.org_id } : { id: postData?.id}: { org_id: postData?.org_id};
            let biometricDetails = await this.dashboardService.findOne(where);
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
                await this.commonArrayService.formatToDto(CompanyDashboardDto, biometricDetails, req.lang)
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
    @UseGuards(AccessGuard)
    @Post('stock-images')
    async stockImages(@Req() req: Request, @Res() res: Response, @Body() postData: stockImagesInput) {
        try {
            let prefix = postData?.type == 'square' ? `stockimages/foursquare/` : `stockimages/billboard/`;
            let list = await lastValueFrom(this.commonMicroservice.send({cmd: 'list_file'}, {prefix: prefix}));
            let data;
            if(list?.Contents){
                data = postData?.type != 'square' ? {} : [];
                if(postData?.type != 'square') {
                    let web = [];
                    let mobile = [];
                    for(let ele of list?.Contents){
                        if(ele['Key']?.includes('mobile/')) {
                            mobile.push({name: ele['Key'], image: S3_URL + ele['Key']});
                        }
                        if(ele['Key']?.includes('web/')){
                            web.push({name: ele['Key'], image: S3_URL + ele['Key']});
                        }
                    }
                    if(web.length || mobile.length){
                        data['web'] = web;
                        data['mobile'] = mobile;
                    }
                }
                else{
                    for(let ele of list?.Contents){
                        data.push({name: ele['Key'], image: S3_URL + ele['Key']});
                    }
                }
            }
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
              });
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data,
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
        AnyFilesInterceptor( {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.COMPANY_DASHBOARD}`,
                filename: fileNameUUID
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() createData: CreateCompanyDashboardInput, @UploadedFiles() files: Record<string, any>) {
        try {
            if (
                !createData.org_id || !createData.imgopt_id
            ) {
                if (files && Object.keys(files).length > 0) {
                    for(let fileData of Object.keys(files)){
                        await this.commonFileService.removeFileFromLocal(`${files[fileData].path}`);  
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                if (!createData.reference_id) {
                    if (files && Object.keys(files).length > 0) {
                        for (let fileData of Object.keys(files)) {
                            await this.commonFileService.removeFileFromLocal(`${files[fileData].path}`);
                        }
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            createData['dashboard_data'] = createData['dashboard_data'] ? JSON.parse(createData['dashboard_data']) : [];
            for(let postData of createData['dashboard_data']){
                if(appConstant.ROLE.WCH == req.tokenUser?.role_id){
                    postData['reference_id'] = createData?.reference_id || 0;
                }
                postData['dimg_healthplanname'] = JSON.stringify(postData['dimg_healthplanname']);
                let findIndexByObject = createData['dashboard_data'].findIndex(obj => JSON.stringify(obj) === JSON.stringify(postData));
                postData['square_img'] = postData['square_img'] ?? '';
                postData['mob_square_img'] = postData['mob_square_img'] ?? '';
                postData['org_id'] = createData.org_id;
                postData['imgopt_id'] = postData['imgopt_id'] ?? createData.imgopt_id;
                postData['dimg_visibility_ids'] = JSON.stringify(postData?.dimg_visibility_ids);
                const resultData = await this.dashboardService.save({...postData,
                    added_by: ([appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) ? 0 : req.tokenUser?.id});
                postData['square_img'] = files.find((e)=> e.fieldname == `square_img[${findIndexByObject}]`) ?? postData['square_img'];
                postData['mob_square_img'] = files.find((e)=> e.fieldname == `mob_square_img[${findIndexByObject}]`) ?? postData['mob_square_img'];
                let imageData ={};
                if (postData['square_img'] && postData['square_img']?.fieldname === `square_img[${findIndexByObject}]`) {
                    postData['square_img'].originalname = this.commonFileService.formatFileName(postData['square_img'].originalname);
                    let filename = `dashboardimages/${createData.org_id}/` + this.commonService.generateMD5(resultData.generatedMaps[0].id.toString()) + '_webIsqr.' + postData['square_img'].originalname.split('.')[postData['square_img'].originalname.split('.').length - 1];
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(postData['square_img'].path),  filename: filename}));
                    imageData['square_img'] = filename;
                }
                else if(postData['square_img']?.includes('stockimages')){
                    let imagedata = postData['square_img'];
                    let filename = `dashboardimages/${createData.org_id}/` + this.commonService.generateMD5(resultData.generatedMaps[0].id.toString()) + '_webIsqr.' + imagedata.split('.')[imagedata.split('.').length - 1];
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'copy_file'}, {from: imagedata,  to: filename}));
                    imageData['square_img'] = filename;
                }
                if (postData['mob_square_img'] && postData['mob_square_img']?.fieldname === `mob_square_img[${findIndexByObject}]`) {
                    postData['mob_square_img'].originalname = this.commonFileService.formatFileName(postData['mob_square_img'].originalname);
                    let filename = `dashboardimages/${createData.org_id}/mobileimages/` + this.commonService.generateMD5(resultData.generatedMaps[0].id.toString()) + '_mobIsqr.' + postData['mob_square_img'].originalname.split('.')[postData['mob_square_img'].originalname.split('.').length - 1]; 
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(postData['mob_square_img'].path),  filename: filename}));
                    imageData['mob_square_img'] = filename;
                }
                else if(postData['mob_square_img']?.includes('stockimages')){
                    let imagedata = postData['mob_square_img'];
                    let filename = `dashboardimages/${createData.org_id}/` + this.commonService.generateMD5(resultData.generatedMaps[0].id.toString()) + '_mobIsqr.' + imagedata.split('.')[imagedata.split('.').length - 1];
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'copy_file'}, {from: imagedata, to: filename}));
                    imageData['mob_square_img'] = filename;
                }
                await this.dashboardService.update({id: resultData.generatedMaps[0].id}, imageData);
            }
            //addded for champion role save dashboard image
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                let wellnessUpdateData = Object.create(null);
                wellnessUpdateData['imglug_id'] = ((createData?.imglug_id) && (createData.imglug_id != 0 && createData.imglug_id !== null)) ? createData.imglug_id : 1;
                if (createData.eligibility != undefined || createData.eligibility != null) {
                    wellnessUpdateData['eligibility'] = createData.eligibility;
                }
                if (createData.imgopt_id != undefined || createData.imgopt_id != null) {
                    wellnessUpdateData['img_option'] = createData.imgopt_id;
                }
                wellnessUpdateData['img_area'] = 2;
                if (createData.slider_limit != undefined || createData.slider_limit != null) {
                    wellnessUpdateData['slider_limit'] = createData.slider_limit;
                }
                const wellnessChampion = await this.wellnessAssignmentService.findOne({ id: createData?.reference_id })
                await this.wellnessAssignmentService.update({ id: wellnessChampion.id }, wellnessUpdateData);
                this.activityLogService.create(wellnessChampion, wellnessUpdateData, tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, req.tokenUser?.id);
            }
            else {              // for org side 
                const companyUpdate = createData?.imgopt_id ? { img_option: createData.imgopt_id } : {};
                if (createData.slider_limit != undefined || createData.slider_limit != null) {
                    companyUpdate['slider_limit'] = createData.slider_limit;
                }
                if (createData.eligibility != undefined || createData.eligibility != null) {
                    companyUpdate['eligibility'] = createData.eligibility;
                }
                const companySetting = await this.companySettingsService.findOne({ org_id: createData.org_id });
                await this.companySettingsService.update({ org_id: createData.org_id }, companyUpdate);
                this.activityLogService.create(companySetting, companyUpdate, tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, req.tokenUser?.id);
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'The Customize Dashboard information has been created successfully.',
            });
        } catch (error) {
            if (files && Object.keys(files).length > 0) {
                for(let fileData of Object.keys(files)){
                    await this.commonFileService.removeFileFromLocal(`${files[fileData].path}`);  
                }
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
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                if (!postData?.reference_id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if (!postData?.id) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let where = Object.create(null);
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                where = {reference_id: postData?.reference_id,status:1}
                if(postData?.id){
                    where = {id: postData?.id,reference_id: postData?.reference_id,status:1}
                }
            }else{
                where = {id: postData?.id,status:1}
            }
            const recordDetails = await this.dashboardService.findOne(where);
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
            if(recordDetails.square_img && recordDetails.square_img != ''){
                await lastValueFrom(this.commonMicroservice.send({cmd: 'delete_file'}, {prefix: recordDetails.square_img}));
            }
            if(recordDetails.mob_square_img && recordDetails.mob_square_img != ''){
                await lastValueFrom(this.commonMicroservice.send({cmd: 'delete_file'}, {prefix: recordDetails.mob_square_img}));
            }
            await this.dashboardService.update(where,{status:2});
            // change setting for champion role
            if(appConstant.ROLE.WCH == req.tokenUser?.role_id && postData.reference_id){
                where = {id: postData.reference_id}
                if (!postData?.id) {
                    let wellnessChampion = Object.create(null);
                    wellnessChampion['img_option'] = null;
                    wellnessChampion['img_area'] = 1;
                    const wellnessChampionData = await this.wellnessAssignmentService.findOne(where)
                    await this.wellnessAssignmentService.update({ id: wellnessChampionData.id }, wellnessChampion);
                    this.activityLogService.create(wellnessChampionData, wellnessChampion, tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, req.tokenUser?.id);
                }
            }
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.COMPANIES.TBL_COMPANY_DASHBOARD, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Dashboard slide successfully deleted.',
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
        AnyFilesInterceptor( {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.COMPANY_DASHBOARD}`,
                filename: fileNameUUID
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() createData: CreateCompanyDashboardInput, @UploadedFiles() files: Record<string, any>) {
        try {
            if (
                !createData.id && !createData.org_id
            ) {
                if (files && Object.keys(files).length > 0) {
                    for(let fileData of Object.keys(files)){
                        await this.commonFileService.removeFileFromLocal(`${files[fileData].path}`);  
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                if (
                    !createData.reference_id
                ) {
                    if (files && Object.keys(files).length > 0) {
                        for (let fileData of Object.keys(files)) {
                            await this.commonFileService.removeFileFromLocal(`${files[fileData].path}`);
                        }
                    }
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let where = createData?.id ? createData.org_id ? { id: createData?.id, org_id: createData.org_id } : { id: createData.id}: { org_id: createData.org_id};
            if(appConstant.ROLE.WCH == req.tokenUser?.role_id){
                where['reference_id'] = createData?.reference_id || 0;
            }
            const recordDetails = await this.dashboardService.findOne(where);
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
            createData['dashboard_data'] = createData['dashboard_data'] ? JSON.parse(createData['dashboard_data']) : [];
            for(let postData of createData['dashboard_data']){
                let dashboardData;
                if(postData?.id){
                    dashboardData = await this.dashboardService.findOne({id: postData?.id});
                }
                if(postData?.dimg_visibility_ids){
                    postData.dimg_visibility_ids = JSON.stringify(postData?.dimg_visibility_ids);
                }
                if(dashboardData && postData?.dimg_visibility == 0 && postData?.dimg_visibility != dashboardData.dimg_visibility){
                    postData.dimg_visibility_ids = null;
                }
                postData['dimg_healthplanname'] = JSON.stringify(postData['dimg_healthplanname']);
                if(!postData?.id){
                    postData['org_id'] = createData.org_id;
                    postData['square_img'] = postData['square_img'] ?? '';
                    postData['mob_square_img'] = postData['mob_square_img'] ?? '';
                    const savedResult = await this.dashboardService.save({...postData, added_by: ([appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) ? 0 : req.tokenUser?.id});
                    if(savedResult){
                        postData['id'] =savedResult.generatedMaps[0].id;
                    }
                }
                let findIndexByObject = createData['dashboard_data'].findIndex(obj => JSON.stringify(obj) === JSON.stringify(postData));
                postData['square_img'] = files.find((e)=> e.fieldname == `square_img[${findIndexByObject}]`) ?? postData['square_img'];
                postData['mob_square_img'] = files.find((e)=> e.fieldname == `mob_square_img[${findIndexByObject}]`) ?? postData['mob_square_img'];
                if (postData['square_img'] && postData['square_img']?.fieldname === `square_img[${findIndexByObject}]`) {
                    postData['square_img'].originalname = this.commonFileService.formatFileName(postData['square_img'].originalname);
                    let filename = `dashboardimages/${createData.org_id}/` + this.commonService.generateMD5(postData?.id.toString()) + '_webIsqr.' + postData['square_img'].originalname.split('.')[postData['square_img'].originalname.split('.').length - 1]; 
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(postData['square_img'].path),  filename: filename}));
                    postData['square_img'] = filename;
                }
                else if(postData['square_img']?.includes('stockimages')){
                    let imagedata = postData['square_img'];
                    let filename = `dashboardimages/${createData.org_id}/` + this.commonService.generateMD5(postData?.id.toString()) + '_webIsqr.' + imagedata.split('.')[imagedata.split('.').length - 1];
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'copy_file'}, {from: imagedata, to: filename}));
                    postData['square_img'] = filename;
                }
                if (postData['mob_square_img'] && postData['mob_square_img']?.fieldname === `mob_square_img[${findIndexByObject}]`) {
                    postData['mob_square_img'].originalname = this.commonFileService.formatFileName(postData['mob_square_img'].originalname);
                    let filename = `dashboardimages/${createData.org_id}/mobileimages/` + this.commonService.generateMD5(postData?.id.toString()) + '_mobIsqr.' + postData['mob_square_img'].originalname.split('.')[postData['mob_square_img'].originalname.split('.').length - 1]; 
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(postData['mob_square_img'].path),  filename: filename}));
                    postData['mob_square_img'] = filename;
                }
                else if(postData['mob_square_img']?.includes('stockimages')){
                    let imagedata = postData['mob_square_img'];
                    let filename = `dashboardimages/${createData.org_id}/` + this.commonService.generateMD5(postData?.id.toString()) + '_mobIsqr.' + imagedata.split('.')[imagedata.split('.').length - 1];
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'copy_file'}, {from: imagedata, to: filename}));
                    postData['mob_square_img'] = filename;
                }
                if(appConstant.ROLE.WCH == req.tokenUser?.role_id){
                    postData['reference_id'] = createData?.reference_id || 0;
                }
                let id = postData?.id;
                delete postData?.id;
                await this.dashboardService.update({id: id, status: Not(2)}, {...postData});
                this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_COMPANY_DASHBOARD, req.tokenUser?.id);
            }
            // for champion role update
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                let wellnessUpdateData = Object.create(null);
                wellnessUpdateData['imglug_id'] = ((createData?.imglug_id) && (createData.imglug_id != 0 && createData.imglug_id !== null)) ? createData.imglug_id : 1;
                if (createData.eligibility != undefined || createData.eligibility != null) {
                    wellnessUpdateData['eligibility'] = createData.eligibility;
                }
                if (createData.imgopt_id != undefined || createData.imgopt_id != null) {
                    wellnessUpdateData['img_option'] = createData.imgopt_id;
                }
                wellnessUpdateData['img_area'] = 2;
                if (createData.slider_limit != undefined || createData.slider_limit != null) {
                    wellnessUpdateData['slider_limit'] = createData.slider_limit;
                }
                const wellnessChampion = await this.wellnessAssignmentService.findOne({ id: createData?.reference_id })
                await this.wellnessAssignmentService.update({ id: wellnessChampion.id }, wellnessUpdateData);
                this.activityLogService.create(wellnessChampion, wellnessUpdateData, tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, req.tokenUser?.id);
            }
            else {  // for org side 
                const companyUpdate = createData?.imgopt_id ? { img_option: createData.imgopt_id } : {};
                if (createData.slider_limit != undefined || createData.slider_limit != null) {
                    companyUpdate['slider_limit'] = createData.slider_limit;
                }
                if (createData.eligibility != undefined || createData.eligibility != null) {
                    companyUpdate['eligibility'] = createData.eligibility;
                }
                const companySetting = await this.companySettingsService.findOne({ org_id: createData.org_id });
                await this.companySettingsService.update({ org_id: createData.org_id }, { ...companyUpdate });
                this.activityLogService.create(companySetting, companyUpdate, tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, req.tokenUser?.id);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'The Customize Dashboard information has been updated successfully.',
            });
        } catch (error) {
            if (files && Object.keys(files).length > 0) {
                for(let fileData of Object.keys(files)){
                    await this.commonFileService.removeFileFromLocal(`${files[fileData].path}`);  
                }
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
            let where = `dashboard.status != 2 `;
            if([appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)){
                where += `AND(dashboard.added_by = 0) `;
            }
            if(appConstant.ROLE.WCH == req.tokenUser?.role_id){
                where += `AND(dashboard.added_by = ${req.tokenUser?.id}) `;
                if(postData?.reference_id){
                    where += `AND(dashboard.reference_id = ${postData?.reference_id}) `;
                }
            }
            let langVal = (postData?.lang_id && postData?.lang_id!='') ? postData?.lang_id : (req.lang && req.lang!='') ? req.lang : 'eng';
            let getlngid:any  = await this.languagesService.findOne({alias : langVal});
            getlngid = getlngid?.id ?? null;
            if(getlngid){
                where += `AND(dashboard.imglug_id = ${getlngid}) `;
            }
            if(postData?.imgopt_id){
                where += `AND(dashboard.imgopt_id = ${postData?.imgopt_id}) `;
            }
            if(postData?.dimg_eligibility){
                where += `AND(dashboard.dimg_eligibility = ${postData?.dimg_eligibility}) `;
            }
            if(postData?.org_id){
                where += `AND(dashboard.org_id = ${postData?.org_id}) `;
            }
            let resultedData;
            if([appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)){
                resultedData = await this.userDashboardImageNew(req);
                if(resultedData.companiesDashboard){
                    await Promise.all(resultedData?.companiesDashboard?.map(async(ele)=>{
                        if(ele.dimg_visibility == 2 && ele.dimg_visibility_ids != ''){
                            ele['location'] = await this.locationService.listRecord(['id', 'code', 'location_name', 'lname'],{id: In(JSON.parse(ele.dimg_visibility_ids))});
                        }
                        if(ele.dimg_visibility == 1 && ele.dimg_visibility_ids != ''){
                            ele['department'] = await this.departmentService.listRecord({id: In(JSON.parse(ele.dimg_visibility_ids))})
                        }
                    }));
                    resultedData.companiesDashboard = <any>(
                        await this.commonArrayService.formatToDto(CompanyDashboardDto, resultedData.companiesDashboard, req.lang)
                        );
                }
                if(resultedData.companies4Dashboard){
                    await Promise.all(resultedData?.companies4Dashboard?.map(async(ele)=>{
                        if(ele.dimg_visibility == 2 && ele.dimg_visibility_ids != ''){
                            ele['location'] = await this.locationService.listRecord(['id', 'code', 'location_name', 'lname'],{id: In(JSON.parse(ele.dimg_visibility_ids))});
                        }
                        if(ele.dimg_visibility == 1 && ele.dimg_visibility_ids != ''){
                            ele['department'] = await this.departmentService.listRecord({id: In(JSON.parse(ele.dimg_visibility_ids))})
                        }
                    }));
                    resultedData.companies4Dashboard = <any>(
                        await this.commonArrayService.formatToDto(CompanyDashboardDto, resultedData.companies4Dashboard, req.lang)
                        );
                }
            }
            else{
                resultedData = await this.dashboardService.listRecord(where,{'dashboard.image_order':'ASC', 'dashboard.id':'ASC'});
                await Promise.all(resultedData.map(async(ele)=>{
                    if(ele.dimg_visibility == 2 && ele.dimg_visibility_ids != ''){
                        ele['location'] = await this.locationService.listRecord(['id', 'code', 'location_name', 'lname'],{id: In(JSON.parse(ele.dimg_visibility_ids))});
                    }
                    if(ele.dimg_visibility == 1 && ele.dimg_visibility_ids != ''){
                        ele['department'] = await this.departmentService.listRecord({id: In(JSON.parse(ele.dimg_visibility_ids))})
                    }
                }));
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(CompanyDashboardDto, resultedData, req.lang)
                    );
            }
            let compsettings = await this.companySettingsService.findOne({org_id: postData?.org_id},['eligibility','img_option','slider_limit']);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { company_settings: resultedData ? compsettings : {}, data: resultedData}, // we have to remove this object and sent all data 
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
    async userDashboardImageNew(req: Request) {
        try{
            let user =  Object.create(req.tokenUser);
            let linkSSOArray = Object.create(null);
            linkSSOArray['datassoforview'] = this.commonService.userDataToSamlRequest(user, 'view', '1', '0');
            linkSSOArray['datassoforscheduler'] = this.commonService.userDataToSamlRequest(user, 'scheduler', '1', '0');
            let companyid = user.org_id;
            let is_camp_eligible = user['is_camp_eligible'];
            let role_id = user['role_id'];
            let udepartment = user['department_id'];
            let ulocation = user['location'];
            let uHealthPlanName = user['insurance_plan_name'];
            let userTimeZone = 'UTC';
            if (user.timezone !== '') {
                userTimeZone = user.timezone;
            }
            let internalLinkData: any = await this.interlinksService.listRecord({status: 1},{ 'id': 'ASC'}, ['id','linktitle','plugin','controller','action','newlink']);
            const userCurrentDate = moment.tz(userTimeZone).format('YYYY-MM-DD HH:mm:ss');
            let company = await this.companyService.findOne(`company.id = ${user.org_id}`,
                [tableConstant.COMPANIES.TBL_COMPANY_SETTINGS],
                ['company','companySetting']);
            const userList = await this.userService.usersDataWellness(user, `user.role_id = 12 AND user.membership_code = '${user['membership_code']}' AND user.status =1`);
            if(userList && userList.length){
                if (user && user?.['settings'] && user?.['settings']?.state) {
                    let stateData = await this.companyService.stateList(user?.['settings']?.state, '');
                    let state = stateData.find(
                        ele =>
                            ele.statecode == user['settings']?.state
                            || ele.state == user['settings']?.state
                    );
                    user['settings'].state = state?.['state'];
                    user['settings'].statecode = state?.['statecode'];

                }
                const usersdatawellnessData = await this.wellnessAssignmentService.listRecord(
                    `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.user_id IN(${userList.map(ele=> ele.id).join(',')}) AND wellnessAssignment.img_option <> '' AND wellnessAssignment.status = 1
                        AND(
                        (wellnessAssignment.location = ${user.location} AND wellnessAssignment.location != 0) OR
                        (wellnessAssignment.department = ${user.department_id} AND wellnessAssignment.department != 0) OR
                        (wellnessAssignment.state = "${user?.settings?.state}" AND wellnessAssignment.state !='') OR      
                        (wellnessAssignment.state = "${user?.settings?.statecode}" AND wellnessAssignment.state !='') OR
                        (wellnessAssignment.city = "${user?.settings?.city}" AND wellnessAssignment.city !='') OR
                        wellnessAssignment.is_global = 1
                        )`,{id: 'DESC'}
                );
                if(usersdatawellnessData && usersdatawellnessData.length){
                    let usersdatawellnessArry = [];
                    for(let wellness of usersdatawellnessData){
                        let showDashboard = false;
                        if ((is_camp_eligible == 1 && wellness['eligibility'] == 1) || (is_camp_eligible == 0 && wellness['eligibility'] == 2)) {
                            showDashboard = true;
                        }
                        if ((user.role_id == 2 && is_camp_eligible == 1 && wellness['eligibility'] == 3) || (user.role_id == 2 && is_camp_eligible == 0 && wellness['eligibility'] == 4)) {
                            showDashboard = true;
                        }
                        if ((user.role_id == 16 && is_camp_eligible == 1 && wellness['eligibility'] == 5) || (user.role_id == 16 && is_camp_eligible == 0 && wellness['eligibility'] == 6)) {
                            showDashboard = true;
                        }
                        if (wellness['eligibility'] == 0 || showDashboard==true) {
                            usersdatawellnessArry.push(wellness);
                        }
                    }
                    company['champaionsDashboard'] = usersdatawellnessArry;
                }
            }
            let langVal = (req.lang && req.lang!='') ? req.lang : 'eng';
            let getlngid:any  = await this.languagesService.findOne({alias : langVal});
            getlngid = getlngid.id ?? null;
            let docdataAll = await this.documentService.listRecord({ organization_id: In([companyid,0]), status: Not(2)});
            let companiesDashboard = [];
            let companies4Dashboard = [];
            let cimg_option = company['companySetting']['img_option'];
            let q_com_id = company['id'];
            let imgoptcheck;
            if(cimg_option == 3){
                imgoptcheck = '1,2';
            }else if(cimg_option == 2){
                 imgoptcheck = 2;
            }else{
                imgoptcheck = 1;
            }
            let where = `dashboard.status = 1 AND(dashboard.org_id = ${company.id} AND dashboard.reference_id = 0 AND dashboard.imgopt_id IN (${imgoptcheck}) AND dashboard.imglug_id = ${getlngid} AND dashboard.square_img != "") AND ((dashboard.displaybasedon = "0" AND (dashboard.from_date IS NULL AND to_date IS NULL)) OR (dashboard.displaybasedon = "1" AND (dashboard.from_date <= '${userCurrentDate}')) OR (dashboard.displaybasedon = "2" AND (dashboard.from_date <= '${userCurrentDate}' AND dashboard.to_date >= '${userCurrentDate}')))`;
            let wcompaniesMDashboard = await this.dashboardService.listRecord(where,{'dashboard.image_order':'ASC'});
            if(!wcompaniesMDashboard || wcompaniesMDashboard?.length == 0){
                getlngid = 1;
            }
            where = `dashboard.status = 1 AND(dashboard.org_id = ${company.id} AND dashboard.reference_id = 0 AND dashboard.imgopt_id = 1 AND dashboard.imglug_id = ${getlngid} AND dashboard.square_img != "") AND ((dashboard.displaybasedon = "0" AND (dashboard.from_date IS NULL AND to_date IS NULL)) OR (dashboard.displaybasedon = "1" AND (dashboard.from_date <= '${userCurrentDate}')) OR (dashboard.displaybasedon = "2" AND (dashboard.from_date <= '${userCurrentDate}' AND dashboard.to_date >= '${userCurrentDate}')))`;
            let companiesMDashboard = await this.dashboardService.listRecord(where,{'dashboard.image_order':'ASC'});
            let champaionsDashboard = [];
            if(company['champaionsDashboard'] && company['champaionsDashboard'].length){
                let key = 1;
                for(let champaionsDashboardvalue of company['champaionsDashboard']){
                    if(champaionsDashboardvalue['id'] && champaionsDashboardvalue['user_id'] && champaionsDashboardvalue['user_id']!='' && champaionsDashboardvalue['id']!=''){
                        let q_RUserID = champaionsDashboardvalue['user_id'];
                        let q_RID = champaionsDashboardvalue['id'];
                        where = `( dashboard.status = 1 AND dashboard.org_id = ${company.id} AND dashboard.added_by = ${q_RUserID} AND dashboard.reference_id = ${q_RID} AND dashboard.imgopt_id = 1 AND dashboard.imglug_id = ${getlngid} AND dashboard.square_img != "") AND ((dashboard.displaybasedon = "0" AND (dashboard.from_date IS NULL AND dashboard.to_date IS NULL)) OR (dashboard.displaybasedon = "1" AND (dashboard.from_date <= '${userCurrentDate}')) OR (dashboard.displaybasedon = "2" AND (dashboard.from_date <= '${userCurrentDate}' AND dashboard.to_date >= '${userCurrentDate}')))`;
                        let AchampaionsDashboard = await this.dashboardService.listRecord(where,{'dashboard.image_order':'ASC'});
                        if(AchampaionsDashboard && AchampaionsDashboard.length){
                            for (let champData of AchampaionsDashboard){
                                champaionsDashboard.push(champData);
                            }
                        }
                    }
                }
            }
            companiesDashboard = [...champaionsDashboard,...companiesMDashboard];
            if(company['companySetting']['img_option'] == 2 || company['companySetting']['img_option'] == 3){
                let fourcondition = `dashboard.status = 1 AND(dashboard.org_id = ${company['id']} AND dashboard.reference_id = 0 AND dashboard.imgopt_id = 2 AND dashboard.imglug_id = ${getlngid} AND dashboard.square_img != "") AND ((dashboard.displaybasedon = "0" AND (dashboard.from_date IS NULL AND dashboard.to_date IS NULL)) OR (dashboard.displaybasedon = "1" AND (dashboard.from_date <= "${userCurrentDate}")) OR (dashboard.displaybasedon = "2" AND (dashboard.from_date <= "${userCurrentDate}" AND dashboard.to_date >= "${userCurrentDate}")))`;
                companies4Dashboard = await this.dashboardService.listRecord(fourcondition,{'dashboard.image_order':'ASC'});
                let championcompanies4Dashboard  = [];
                if(company['champaionsDashboard'] && company['champaionsDashboard'].length && company['champaionsDashboard'][0]['id'] && company['champaionsDashboard'][0]['RUserID'] && company['user_id']!='' && company['champaionsDashboard'][0]['user_id']!=''){
                    let q_RUserID = company['champaionsDashboard'][0]['user_id'];
                    let q_RID = company['champaionsDashboard'][0]['id']
                    fourcondition = `dashboard.status = 1 AND(dashboard.org_id = ${company['id']} AND dashboard.added_by = ${q_RUserID} AND dashboard.reference_id = ${q_RID} AND dashboard.imgopt_id = 2 AND dashboard.imglug_id = ${getlngid} AND dashboard.square_img != "") AND ((dashboard.displaybasedon = "0" AND (dashboard.from_date IS NULL AND dashboard.to_date IS NULL)) OR (dashboard.displaybasedon = "1" AND (dashboard.from_date <= '${userCurrentDate}')) OR (dashboard.displaybasedon = "2" AND (dashboard.from_date <= "${userCurrentDate}" AND dashboard.to_date >= '${userCurrentDate}')))`;
                    championcompanies4Dashboard = await this.dashboardService.listRecord(fourcondition,{'dashboard.image_order':'ASC'})
                }
                companies4Dashboard = [...championcompanies4Dashboard,...companies4Dashboard];
            }
            let showDashboard = false;
            if ((is_camp_eligible == 1 && company['companySetting']['eligibility'] == 1) || (is_camp_eligible == 0 && company['companySetting']['eligibility'] == 2)) {
                showDashboard = true;
            }
            if ((role_id == 2 && is_camp_eligible == 1 && company['companySetting']['eligibility'] == 3) || (role_id == 2 && is_camp_eligible == 0 && company['companySetting']['eligibility'] == 4)) {
                showDashboard = true;
            }
            if ((role_id == 16 && is_camp_eligible == 1 && company['companySetting']['eligibility'] == 5) || (role_id == 16 && is_camp_eligible == 0 && company['companySetting']['eligibility'] == 6)) {
                showDashboard = true;
            }  
            if(showDashboard==false && company['companySetting']['eligibility'] == 0){
                showDashboard = true;
            }
            if (company['companySetting']['eligibility'] != 0 && showDashboard==false) {
                company['companySetting']['img_option'] = 0;
            }
            if (company && company['companySetting']['slider_limit'] !== undefined && company['companySetting']['slider_limit'] !== 0) {
                company['companySetting']['slider_limit'] = company['companySetting']['slider_limit'].toString() + '000';
            }            
            if(company['companySetting']['img_option'] == 1 || company['companySetting']['img_option'] == 3){
                if(company['companySetting']['img_area'] == 1 && companiesDashboard.length){
                     for( let bigrow of companiesDashboard){
                            company['big_img'] = S3_URL + bigrow.square_img + '?' + moment().valueOf();
                            company['mob_big_img'] = S3_URL + bigrow.mob_square_img + '?' + moment().valueOf();
                            company['big_img_link_accessibility'] = 0;
                            if (bigrow.square_img_link_isin) {
                                company['big_img_link'] = 'https://' + process.env.DOMAIN;
                                if(bigrow.square_img_link_id){
                                    let path = await this.commonDateService.manageAllURL('g_internal_link', {'inLinkId' : bigrow.square_img_link_id},internalLinkData);
                                    company['big_img_link'] = 'https://' + process.env.DOMAIN + '/'+ path;
                                }
                                else{
                                    if (bigrow.square_img_link !== '' && bigrow.square_img_link !== null) {
                                        const temp = bigrow.square_img_link.split(",");
                                        const plug = temp[0];
                                        let path = await this.commonDateService.manageAllURL('g_plugin_link', {'pluginName' : plug},internalLinkData);
                                        company['big_img_link'] = 'https://' + process.env.DOMAIN + '/'+ path;
                                    }
                                }
                            }
                          else{
                            if (bigrow['square_img_link'].includes('/documentmanagement/documentmanagement/downloads/')) {
                                let doc_id = Number(atob(decodeURIComponent((new URL(bigrow.square_img_link)).pathname.split('/').pop())));
                                if (docdataAll.filter(doc => doc.id == doc_id).length > 0) {
                                    let newLinkPath = await this.urlManageService.onmapUrl(bigrow.square_img_link);
                                    company['big_img_link'] = decodeURIComponent(newLinkPath);
                                    company['big_img_link_accessibility'] = 1;
                                    company['big_img_link_doc_id'] = doc_id;
                                } else {
                                    company['big_img_link'] = 'https://' + process.env.DOMAIN;
                                }
                            }
                            else if (bigrow['square_img_link'] === "https://sso.preventioncloud.com/ehealth" || bigrow['square_img_link'] === "https://sso.preventioncloud.com/ehealth/view") {
                                if (bigrow['square_img_link'] === "https://sso.preventioncloud.com/ehealth/view") {
                                    company['big_img_link'] = "https://sso.preventioncloud.com/ehealth?SAMLRequest=" + linkSSOArray['datassoforview'];
                                } else {
                                    company['big_img_link'] = "https://sso.preventioncloud.com/ehealth?SAMLRequest=" + linkSSOArray['datassoforscheduler'];
                                }
                            } else {
                                let newLinkPath = await this.urlManageService.onmapUrl(bigrow['square_img_link']);
                                company['big_img_link'] = decodeURIComponent(newLinkPath);
                            }
                          }
                          if (bigrow['square_img_link_isin'] === '') {
                            company['big_img_link_isin'] = "0";
                        } else {
                            company['big_img_link_isin'] = bigrow['square_img_link_isin'];
                        }
                        if (bigrow['from_date'] === '') {
                            company['bfrom_date'] = "";
                        } else {
                            company['bfrom_date'] = bigrow['from_date'];
                        }
                        if (bigrow['to_date'] === '') {
                            company['bto_date'] = "";
                        } else {
                            company['bto_date'] = bigrow['to_date'];
                        }
                        company['bdisplaybasedon'] = (bigrow['displaybasedon'] !== undefined && bigrow['displaybasedon'] !== '' && bigrow['displaybasedon'] !== null) 
                            ? bigrow['displaybasedon'] 
                            : '0';
                        company['big_img_link_id'] = (bigrow['square_img_link_id'] !== undefined && bigrow['square_img_link_id'] !== '' && bigrow['square_img_link_id'] !== null) 
                            ? bigrow['square_img_link_id'] 
                            : null;
                        if (bigrow['displaybasedon'] === 1 && moment(bigrow['from_date']).isSameOrAfter(moment(userCurrentDate))) {
                            company['big_img'] = '';
                            company['big_img_link'] = '';
                            company['big_img_link_isin'] = '0';
                        } else if (bigrow['displaybasedon'] === 2 && (moment(bigrow['from_date']).isSameOrAfter(moment(userCurrentDate)) || moment(bigrow['to_date']).isSameOrBefore(moment(userCurrentDate)))) {
                            company['big_img'] = '';
                            company['big_img_link'] = '';
                            company['big_img_link_isin'] = '0';
                        }
                          /* TUSHAR ADDED END */
                     }
                }else{
                    company['big_img'] = company['mob_big_img'] = company['big_img_link'] = company['bfrom_date'] = company['bto_date'] = '';
                    company['big_img_link_isin'] = company['bdisplaybasedon'] = "0";
                    company['big_img_link_accessibility'] = 0;
                }
            }
            const processedData = [];
            if (company['companySetting']['img_option'] === 2 || company['companySetting']['img_option'] === 3) {
                if (companies4Dashboard && companies4Dashboard.length > 0) {
                    for(let  c4dRow of companies4Dashboard){
                        const item = {};
                        item['id'] = c4dRow?.id;
                        item['square_img'] = `${S3_URL}${c4dRow.square_img}?${new Date().getTime()}`;
                        item['mob_square_img'] = `${S3_URL}${c4dRow.mob_square_img}?${new Date().getTime()}`;
                        item['square_img_link_accessibility'] = 0;
                        if (c4dRow.square_img_link_isin && c4dRow.square_img_link_isin != '0') {
                            item['square_img_link'] = 'https://' + process.env.DOMAIN;
                            if(c4dRow.square_img_link_id && c4dRow.square_img_link_id != ''){
                                let path = await this.commonDateService.manageAllURL('g_internal_link', {'inLinkId' : c4dRow.square_img_link_id},internalLinkData);
                                item['square_img_link'] = 'https://' + process.env.DOMAIN + '/'+path;
                                item['square_img_link_id'] = c4dRow.square_img_link_id;
                            }
                            else{
                                if (c4dRow.square_img_link !== '' && c4dRow.square_img_link !== null) {
                                    const temp = c4dRow.square_img_link.split(",");
                                    const plug = temp[0];
                                    let path = await this.commonDateService.manageAllURL('g_plugin_link', {'pluginName' : plug},internalLinkData);
                                    item['square_img_link'] = 'https://' + process.env.DOMAIN + '/'+path;
                                    item['square_img_link_id'] = c4dRow.square_img_link_id;
                                }
                            }
                        } else {
                            if (c4dRow.square_img_link.includes('/documentmanagement/documentmanagement/downloads/')) {
                                let doc_id = Number(atob(decodeURIComponent((new URL(c4dRow.square_img_link)).pathname.split('/').pop())));
                                if (docdataAll.filter(doc => doc.id == doc_id).length > 0) {
                                    let newLinkPath = await this.urlManageService.onmapUrl(c4dRow.square_img_link);
                                    item['square_img_link'] = decodeURIComponent(newLinkPath);
                                    item['square_img_link_accessibility'] = 1;
                                    item['square_img_link_doc_id'] = doc_id;
                                } else {
                                    item['square_img_link'] = 'https://' + process.env.DOMAIN;
                                }
                            } else if (c4dRow.square_img_link === "https://sso.preventioncloud.com/ehealth" || c4dRow.square_img_link === "https://sso.preventioncloud.com/ehealth/view") {
                                if (c4dRow.square_img_link === "https://sso.preventioncloud.com/ehealth/view") {
                                    item['square_img_link'] = `https://sso.preventioncloud.com/ehealth?SAMLRequest=${linkSSOArray.datassoforview}`;
                                } else {
                                    item['square_img_link'] = `https://sso.preventioncloud.com/ehealth?SAMLRequest=${linkSSOArray.datassoforscheduler}`;
                                }
                            } else {
                                let newLinkPath = await this.urlManageService.onmapUrl(c4dRow.square_img_link);
                                item['square_img_link'] = decodeURIComponent(newLinkPath);
                                item['square_img_link_id'] = null;
                            }
                        }
                        item['square_img_link_isin'] = c4dRow.square_img_link_isin === '' ? "0" : c4dRow.square_img_link_isin;
                        item['from_date'] = c4dRow.from_date === '' ? "" : c4dRow.from_date;
                        item['to_date'] = c4dRow.to_date === '' ? "" : c4dRow.to_date;
                        item['square_img_activity'] = c4dRow.square_img_activity === '' ? "" : c4dRow.square_img_activity;
                        item['displaybasedon'] = c4dRow.displaybasedon;
                        const userCurrentDateMoment = moment(userCurrentDate);
                        const fromDateMoment = moment(c4dRow.from_date);
                        const toDateMoment = moment(c4dRow.to_date);
                        if (c4dRow.displaybasedon === 1 && fromDateMoment.isSameOrAfter(userCurrentDateMoment)) {
                            item['square_img'] = '';
                            item['square_img_link'] = '';
                            item['square_img_link_isin'] = '0';
                            item['square_img_link_id'] = null;
                        } else if (c4dRow.displaybasedon === 2 && (fromDateMoment.isSameOrAfter(userCurrentDateMoment) || toDateMoment.isSameOrBefore(userCurrentDateMoment))) {
                            item['square_img'] = '';
                            item['square_img_link'] = '';
                            item['square_img_link_isin'] = '0';
                            item['square_img_link_id'] = null;
                        }
                        // Tushar added end
                        // Push processed item into the new array
                        processedData.push(item);
                    };
                }
            }
            if(company['companySetting']['img_option'] == 1 || company['companySetting']['img_option'] == 3){
                let showImgCount = 0;
                if(company['companySetting']['img_area'] == 2 && companiesDashboard.length){
                    for (let companiesDashboardval of companiesDashboard){
                        let showSingleDashboard = true;
                        let showSingleDashboardVisibility = true;
                        let showSingleDashboardHealth = true;
                        if(company['companySetting']['img_area'] == 2){
                            showSingleDashboard = false;
                            if((companiesDashboardval['dimg_eligibility'] != undefined || companiesDashboardval['dimg_eligibility'] != null) && companiesDashboardval['dimg_eligibility'] == 0) {
                                showSingleDashboard = true;
                            }
                            if (companiesDashboardval['dimg_eligibility'] && (is_camp_eligible == 1 && companiesDashboardval['dimg_eligibility'] == 1) || (is_camp_eligible == 0 && companiesDashboardval['dimg_eligibility'] == 2)) {
                                showSingleDashboard = true;
                            }
                            if (companiesDashboardval['dimg_eligibility'] && (role_id == 2 && is_camp_eligible == 1 && companiesDashboardval['dimg_eligibility'] == 3) || (role_id == 2 && is_camp_eligible == 0 && companiesDashboardval['dimg_eligibility'] == 4)) {
                                showSingleDashboard = true;
                            }
                            if (companiesDashboardval['dimg_eligibility'] && (role_id == 16 && is_camp_eligible == 1 && companiesDashboardval['dimg_eligibility'] == 5) || (role_id == 16 && is_camp_eligible == 0 && companiesDashboardval['dimg_eligibility'] == 6)) {
                                showSingleDashboard = true;
                            }
                            let dImageDeptLoc = (companiesDashboardval['dimg_visibility'] && companiesDashboardval['dimg_visibility'] !== 0 && companiesDashboardval['dimg_visibility_ids'] !== null && companiesDashboardval['dimg_visibility_ids'] !== '') 
                                ? JSON.parse(companiesDashboardval['dimg_visibility_ids']) 
                                : [];
                            let dImageHealthPlan = (companiesDashboardval['dimg_healthplan'] && companiesDashboardval['dimg_healthplan'] !== 0 && companiesDashboardval['dimg_healthplanname'] !== null && companiesDashboardval['dimg_healthplanname'] !== '') 
                                ? JSON.parse(companiesDashboardval['dimg_healthplanname']) 
                                : [];
                            showSingleDashboardVisibility = true;
                            if (dImageDeptLoc && dImageDeptLoc.length) {
                                if (dImageDeptLoc.includes(udepartment.toString())) {
                                    showSingleDashboardVisibility = true;
                                } else if (dImageDeptLoc.includes(ulocation?.toString())) {
                                    showSingleDashboardVisibility = true;
                                } else if (dImageDeptLoc.includes('0')) {
                                    showSingleDashboardVisibility = true;
                                } else {
                                    showSingleDashboardVisibility = false;
                                }
                            }
                            showSingleDashboardHealth = true;
                            if(companiesDashboardval['dimg_healthplan'] && companiesDashboardval['dimg_healthplan'] == 1 && dImageHealthPlan && dImageHealthPlan){
                                if(dImageHealthPlan.includes(uHealthPlanName)){
                                    showSingleDashboardHealth = true;
                                }else{
                                    showSingleDashboardHealth = false;
                                }
                            }
                        }
                        if(companiesDashboardval['square_img'] != '' && showSingleDashboard == true && showSingleDashboardVisibility == true && showSingleDashboardHealth == true){
                               showImgCount += 1;
                               companiesDashboardval['mob_square_img'] =  S3_URL + companiesDashboardval['mob_square_img'] + '?' + moment().valueOf();
                               companiesDashboardval['square_img'] =  S3_URL + companiesDashboardval['square_img'] + '?' + moment().valueOf();
                               companiesDashboardval['square_img_link_accessibility'] = 0;
                            if(companiesDashboardval['square_img_link_isin'] && companiesDashboardval['square_img_link_isin'] != '0'){
                                if(companiesDashboardval.square_img_link_id && companiesDashboardval.square_img_link_id != ''){
                                    let path = await this.commonDateService.manageAllURL('g_internal_link', {'inLinkId' : companiesDashboardval.square_img_link_id},internalLinkData);
                                    companiesDashboardval['square_img_link'] = 'https://' + process.env.DOMAIN + '/'+path;
                                    companiesDashboardval['square_img_link_id'] = companiesDashboardval.square_img_link_id;
                                }
                                else{
                                    if(companiesDashboardval['square_img_link'] != '' && companiesDashboardval['square_img_link'] != null){
                                        const temp = companiesDashboardval.square_img_link.split(",");
                                        const plug = temp[0];
                                        companiesDashboardval['square_img_link_isin'] = '0';
                                        let path = await this.commonDateService.manageAllURL('g_plugin_link', {'pluginName' : plug},internalLinkData);
                                        companiesDashboardval['square_img_link'] = 'https://' + process.env.DOMAIN + '/'+path;
                                    }
                                    else{
                                        companiesDashboardval['square_img_link'] = 'https://' + process.env.DOMAIN;
                                    }
                                }
                            }else{
                                if (companiesDashboardval['square_img_link'].includes('/documentmanagement/documentmanagement/downloads/')) {
                                    let doc_id = Number(atob(decodeURIComponent((new URL(companiesDashboardval.square_img_link)).pathname.split('/').pop())));
                                    if (docdataAll.filter(doc => doc.id == doc_id).length > 0) {
                                        let newLinkPath = await this.urlManageService.onmapUrl(companiesDashboardval.square_img_link);
                                        companiesDashboardval['square_img_link'] = decodeURIComponent(newLinkPath);
                                        companiesDashboardval['square_img_link_accessibility'] = 1;
                                        companiesDashboardval['square_img_link_doc_id'] = doc_id;
                                    } else {
                                        companiesDashboardval['square_img_link'] = 'https://' + process.env.DOMAIN;
                                    }
                                }else if (companiesDashboardval['square_img_link'] === "https://sso.preventioncloud.com/ehealth" || companiesDashboardval['square_img_link'] === "https://sso.preventioncloud.com/ehealth/view") {
                                    if (companiesDashboardval['square_img_link'] === "https://sso.preventioncloud.com/ehealth/view") {
                                        companiesDashboardval['square_img_link'] = "https://sso.preventioncloud.com/ehealth?SAMLRequest=" + linkSSOArray['datassoforview'];
                                    } else {
                                        companiesDashboardval['square_img_link'] = "https://sso.preventioncloud.com/ehealth?SAMLRequest=" + linkSSOArray['datassoforscheduler'];
                                    }
                                } else {
                                    let newLinkPath = await this.urlManageService.onmapUrl(companiesDashboardval['square_img_link']);
                                    companiesDashboardval['square_img_link'] = decodeURIComponent(newLinkPath);
                                    companiesDashboardval['square_img_link_isin'] = "0";
                                }
                            }
                          }else{
                            companiesDashboard = companiesDashboard.filter(item => item !== companiesDashboardval);
                          }
                     }
                }
                if (showImgCount == 0 && company['companySetting']['img_area'] == 2 && company['companySetting']['img_option'] == 1) {
                    company['companySetting']['img_option'] = 0;
                }
            }
            if(company['companySetting']['img_option'] == 0){
                company['companySetting']['img_option'] = 1;
                company['companySetting']['img_area'] = 1; 
            }
            // outer eligibility issue solved here ZOMO-2389
            companiesDashboard = showDashboard ? companiesDashboard : [];
            let result = Object.create(null);
            result['company'] = company;                      
            result['companiesDashboard'] = companiesDashboard;
            // remove condition for large billboard image ZOMO-405
            if(companiesDashboard.length == 0){
                let path = await this.commonDateService.manageAllURL('g_plugin_link', {'pluginName' : 'hra'},internalLinkData);
                result['companiesDashboard'] = [{
                    square_img: company?.['big_img'] || S3_URL + "comn/assets/img/health_new.png",
                    mob_square_img: company?.['mob_big_img'] || S3_URL + "comn/assets/img/app_health_new.png",
                    square_img_link_isin: company?.['big_img_link_isin'] && company?.['big_img_link_isin'] != '0' ? company?.['big_img_link_isin'] : "1",
                    square_img_link:  company?.['big_img_link'] || 'https://' + process.env.DOMAIN + '/'+path,
                    square_img_link_id: company?.['big_img_link_id'] && company?.['big_img_link_id'] != '0' ? company?.['big_img_link_id'] : "6",
                }];
            }
            if(processedData.length){
                result['companies4Dashboard'] = processedData;
            }
            return result
        }
        catch (error) {
            throw new Error(await this.translatorService.frontendReadTranslation(req.lang,error.message));
        }
    }
    @Post('click')
    async click(@Req() req: Request, @Res() res: Response, @Body() postData: CreatebillboardclickInput) {
        try {
            if (![appConstant.ROLE.REGISTERED,appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)) {
                throw new Error(this.translatorService.translate(req.lang, 'ERR_FORBIDDEN_ACCESS'));
            }
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.created_date = new Date();
            postData.updated_date = new Date();
            if (postData?.type == null || !postData?.ref_id || postData?.source == null) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            await this.dashboardClickService.create(postData);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Success'
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