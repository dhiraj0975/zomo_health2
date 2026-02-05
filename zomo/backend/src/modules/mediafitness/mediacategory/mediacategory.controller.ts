import { CommonArrayService, CommonFileService, CommonService, MediaCategoryDto, appConstant, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { In, IsNull, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { FrontService } from "../front/front.service";
import { PaginationWithMediaFitnessInput } from '../input';
import { MediaPostService } from "../mediapost/mediapost.service";
import { CategoryListInput, CreateMediaCategoryInput } from './input';
import { MediaCategoryService } from "./mediacategory.service";
const path = require('path');
@Controller('media/category')
@UseGuards(TokenGuard, RoleGuard)
export class MediaCategoryController {
    constructor(
        private readonly mediaCategoryService: MediaCategoryService,
        private readonly mediaPostService: MediaPostService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
        private readonly frontService: FrontService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationWithMediaFitnessInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) ? 'media.status !=2 ' : 'media.status = 1 ';
            if(postData?.org_id){
                where +=`AND media.org_id = '${postData?.org_id}' `;
            }
            if(postData?.parent_id){
                where +=`AND media.parent_id = '${postData?.parent_id}' `;
            }
            if (postData?.search_str) {
                switch (postData?.search_str.trim()) {
                    case "Block Layout":
                        where += `AND media.layout_type = 0`;
                        break;
                    case "Left Layout":
                        where += `AND media.layout_type = 2`;
                        break;
                    case "Tab Layout":
                        where += `AND media.layout_type = 1`;
                        break;
                    default:
                        where += `AND(media.title LIKE '%${postData?.search_str}%' OR media.description LIKE '%${postData?.search_str}%' OR media.img LIKE '%${postData?.search_str}%' OR category.title LIKE '%${postData?.search_str}%')`;
                }
            }
            const resultedData = await this.mediaCategoryService.paginateList(
                where,
                postData,
            );
            if (req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN) {
                await Promise.all(resultedData['list'].map(async (element)=>{
                    if (element?.parent_id == null || element?.parent_id == undefined) {
                        element['category_heirarchy'] = element?.title;
                    }
                    else{
                        let categoryParent = await this.getParent(element.id, [], req);
                        element['category_heirarchy'] = categoryParent?.concatenatedString ? categoryParent?.concatenatedString.slice().reverse().join(' -> ') : '';
                    }
                }));
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MediaCategoryDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['id']}`,`dynamic`);
                        ele.title = (customName == '' || customName == `category_title_${ele['id']}`) ? ele['title'] : customName;
                    }
                }));
            }
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
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let mediaCategory = await this.mediaCategoryService.findOne(where);
            if (!mediaCategory) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            mediaCategory = <any>(
                await this.commonArrayService.formatToDto(MediaCategoryDto, mediaCategory, req.lang)
            );
            if(mediaCategory.title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${mediaCategory['id']}`, `/LC_MESSAGES/Media/Media/${mediaCategory['org_id']}/${mediaCategory['id']}`,`dynamic`);
                mediaCategory.title = (customName == '' || customName == `category_title_${mediaCategory['id']}`) ? mediaCategory['title'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: mediaCategory,
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
        FileInterceptor("img", {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.WELLBEING_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaCategoryInput, @UploadedFile() file: Express.Multer.File) {
        try {
            postData['description'] = postData?.description ?? ' ';
            if(Number.isNaN(postData?.parent_id)){
                delete postData?.parent_id;
            }
            if (
                !postData?.org_id ||
                !postData?.title ||
                !postData?.description
            ) {
                if (file && file.fieldname === 'img' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = { org_id: postData?.org_id, title: postData?.title, status: 1 };
            if(postData?.parent_id){
                where['parent_id'] = postData?.parent_id;
            }
            const categoryCheck = await this.mediaCategoryService.findOne(where);
            if (categoryCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This title has already been used in same level."));
            }
            postData['img'] = '';
            if(postData?.parent_id == 0){
                postData['parent_id'] = null;
            }
            // will remove this function after old system removal
            let resultedData = await this.mediaCategoryService.saveNew({...postData,
                created_by: req.tokenUser?.id,
                updated_by : req.tokenUser?.id
            }, postData?.parent_id);
            let dynamicData = Object.create(null);
            if(postData?.title){
                let title = `category_title_${resultedData['id']}`
                dynamicData[`${title}`]= postData?.title;
            }           
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicData,'Edit','Media',resultedData['id']);
            if (file && file.fieldname === 'img' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `media/cat/${postData?.org_id}/mecat_${this.commonService.generateMD5(resultedData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                // for thumbnail
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                postData['img'] = filename;
                await this.mediaCategoryService.update({id: resultedData['id']},{...postData});
            }
            /* Side bar media name change check category not exist and name blank then Fitness Video default name show start
            let sideMenuSettingsData = await this.frontService.sideMenuSettingsData(['sms.org_id','sms.datasettingmenu','sms.showmenulist'],{org_id: postData?.org_id, status: '1'});
            if (sideMenuSettingsData?.datasettingmenu && sideMenuSettingsData?.showmenulist) {
                sideMenuSettingsData.showmenulist =  JSON.parse(sideMenuSettingsData.showmenulist);
                for (let i = 0; i < Object.keys(sideMenuSettingsData.showmenulist).length; i++) {
                    let key = Object.keys(sideMenuSettingsData.showmenulist)[i];
                    if (key == 'Media' && sideMenuSettingsData.showmenulist[key]?.['Mainmenucustomname'] == '') {
                        let checkExist = await this.frontService.mediaCategoryClicksExists({org_id: postData?.org_id, status: '1'});
                        if (!checkExist) {
                            const dynamicData = {};
                            dynamicData[`${key}_${postData?.org_id}`] = await this.translatorService.frontendReadTranslation(req.lang,'Fitness Videos', `/LC_MESSAGES/Media/Media`,`static`);
                            await this.translatorService.DynamicEngJsonData('Common', postData?.org_id, dynamicData,'Edit','Menu');
                        } else {
                            const dynamicData = {};
                            dynamicData[`${key}_${postData?.org_id}`] = await this.translatorService.frontendReadTranslation(req.lang,'Media', `/LC_MESSAGES/Media/Media`,`static`);
                            await this.translatorService.DynamicEngJsonData('Common', postData?.org_id, dynamicData,'Edit','Menu');
                        }
                    }
                }
            }
            Side bar media name change check category not exist and name blank then Fitness Video default name show end */
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Category has been added successfully"),
            });
        } catch (error) {
            if (file && file.fieldname === 'img' && file.filename) {
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
            postData['status'] = postData?.status ?? 2;
            const recordDetails = await this.mediaCategoryService.findOne(where);
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
            await this.mediaCategoryService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_CATEGORY, req.tokenUser?.id, 'delete');
            postData['status'] = 2;
            if((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status){
                await this.mediaCategoryService.update({id: postData.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                this.activityLogService.create(recordDetails, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_CATEGORY, req.tokenUser?.id);
                let mediaPost = await this.mediaPostService.findOne({cat_id: postData?.id});
                if (mediaPost) {
                    await this.mediaPostService.update({cat_id: postData?.id, status: Not(2)},{status: postData?.status, updated_by: req.tokenUser?.id});
                    this.activityLogService.create(mediaPost, {status: postData?.status, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_POST, req.tokenUser?.id);
                }
                const mediaCategory = await this.mediaCategoryService.listRecord(`fc.parent_id = ${postData?.id} AND fc.status != 2`);
                for(let ele of mediaCategory){
                    await this.mediaCategoryService.update({id: ele.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                    this.activityLogService.create(ele, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_CATEGORY, req.tokenUser?.id);
                    let mediaPost = await this.mediaPostService.findOne({cat_id: ele.id});
                    if (mediaPost) {
                        await this.mediaPostService.update({cat_id: ele.id, status: Not(2)},{status: postData?.status, updated_by: req.tokenUser?.id});
                        this.activityLogService.create(mediaPost, {status: postData?.status, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_POST, req.tokenUser?.id);
                    }
                    await this.updateStatus(ele.id, postData.status, req);
                }
            }
            /* Side bar media name change check category not exist and name blank then Fitness Video default name show start
            let sideMenuSettingsData = await this.frontService.sideMenuSettingsData(['sms.org_id','sms.datasettingmenu','sms.showmenulist'],{org_id: postData?.org_id, status: '1'});
            if (sideMenuSettingsData?.datasettingmenu && sideMenuSettingsData?.showmenulist) {
                sideMenuSettingsData.showmenulist =  JSON.parse(sideMenuSettingsData.showmenulist);
                for (let i = 0; i < Object.keys(sideMenuSettingsData.showmenulist).length; i++) {
                    let key = Object.keys(sideMenuSettingsData.showmenulist)[i];
                    if (key == 'Media' && sideMenuSettingsData.showmenulist[key]?.['Mainmenucustomname'] == '') {
                        let checkExist = await this.frontService.mediaCategoryClicksExists({org_id: postData?.org_id, status: '1'});
                        if (!checkExist) {
                            const dynamicData = {};
                            dynamicData[`${key}_${postData?.org_id}`] = await this.translatorService.frontendReadTranslation(req.lang,'Fitness Videos', `/LC_MESSAGES/Media/Media`,`static`);
                            await this.translatorService.DynamicEngJsonData('Common', postData?.org_id, dynamicData,'Edit','Menu');
                        } else {
                            const dynamicData = {};
                            dynamicData[`${key}_${postData?.org_id}`] = await this.translatorService.frontendReadTranslation(req.lang,'Media', `/LC_MESSAGES/Media/Media`,`static`);
                            await this.translatorService.DynamicEngJsonData('Common', postData?.org_id, dynamicData,'Edit','Menu');
                        }
                    }
                }
            }
            Side bar media name change check category not exist and name blank then Fitness Video default name show end */
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Category has been deleted successfully"),
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
        FileInterceptor('img', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.FITNESS_IMAGE_PATH}`,
                filename: fileName,
            }),
            fileFilter: filesFilter,
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaCategoryInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (
                !postData?.id
            ) {
                if (file && file.fieldname === 'img' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.mediaCategoryService.findOne(where);
            if (!recordDetails) {
                await this.mediaCategoryService.save({
                    ...postData,
                    created_by: req.tokenUser?.id,
                    updated_by: req.tokenUser?.id
                });
            }
            if (file && file.fieldname === 'img' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `media/cat/${postData?.org_id}/mecat_${this.commonService.generateMD5(recordDetails['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
               await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
               postData['img'] = filename;
           }
            if(postData?.parent_id == 0){
                postData['parent_id'] = null;
            }
            if(postData?.parent_id == postData?.id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_VALUE"));
            }
            if(postData?.parent_id && !recordDetails.parent_id){
                const recordDetails = await this.mediaCategoryService.findOne({id: postData?.parent_id});
                if(recordDetails.parent_id && recordDetails?.parent_id !=0){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_VALUE"));
                }
            }else{
                const recordDetail = await this.mediaCategoryService.listRecord({parent_id: recordDetails.id, status: Not(2)},'fc.id','DESC');
                let data = recordDetail.map(ele => ele.id == postData?.parent_id).includes(true);
                if(data){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_VALUE"));
                }
            }
            if(postData?.parent_id && recordDetails?.parent_id && postData?.parent_id != recordDetails?.parent_id){
                await this.mediaCategoryService.updateNew({...postData,updated_by: req.tokenUser?.id}, postData?.parent_id);
            }
            else {
                await this.mediaCategoryService.update(where, {...postData,updated_by: req.tokenUser?.id});
            }
            let dynamicData = Object.create(null);
            if(postData?.title){
                let title = `category_title_${recordDetails['id']}`
                dynamicData[`${title}`]= postData?.title;
            }           
            await this.translatorService.DynamicEngJsonData('Media',recordDetails.org_id,dynamicData,'Edit','Media',recordDetails['id']);
            this.activityLogService.create(recordDetails, {...postData,updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_CATEGORY, req.tokenUser?.id);
            if((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status){
                await this.mediaCategoryService.update({id: postData.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                this.activityLogService.create(recordDetails, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_CATEGORY, req.tokenUser?.id);
                const mediaCategory = await this.mediaCategoryService.listRecord(`fc.parent_id = ${postData?.id} AND fc.status != 2`);
                let mediaPost = await this.mediaPostService.findOne({cat_id: postData?.id});
                if (mediaPost) {
                    await this.mediaPostService.update({cat_id: postData?.id, status: Not(2)},{status: postData?.status, updated_by: req.tokenUser?.id});
                    this.activityLogService.create(mediaPost, {status: postData?.status, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_POST, req.tokenUser?.id);
                }
                for(let ele of mediaCategory){
                    await this.mediaCategoryService.update({id: ele.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                    this.activityLogService.create(ele, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_CATEGORY, req.tokenUser?.id);
                    let mediaPost = await this.mediaPostService.findOne({cat_id: ele.id});
                    if (mediaPost) {
                        await this.mediaPostService.update({cat_id: ele.id, status: Not(2)},{status: postData?.status, updated_by: req.tokenUser?.id});
                        this.activityLogService.create(mediaPost, {status: postData?.status, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_POST, req.tokenUser?.id);
                    }
                    await this.updateStatus(ele.id, postData.status, req);
                }
            }
            /* Side bar media name change check category not exist and name blank then Fitness Video default name show start
            let sideMenuSettingsData = await this.frontService.sideMenuSettingsData(['sms.org_id','sms.datasettingmenu','sms.showmenulist'],{org_id: postData?.org_id, status: '1'});
            if (sideMenuSettingsData?.datasettingmenu && sideMenuSettingsData?.showmenulist) {
                sideMenuSettingsData.showmenulist =  JSON.parse(sideMenuSettingsData.showmenulist);
                for (let i = 0; i < Object.keys(sideMenuSettingsData.showmenulist).length; i++) {
                    let key = Object.keys(sideMenuSettingsData.showmenulist)[i];
                    if (key == 'Media' && sideMenuSettingsData.showmenulist[key]?.['Mainmenucustomname'] == '') {
                        let checkExist = await this.frontService.mediaCategoryClicksExists({org_id: postData?.org_id, status: '1'});
                        if (!checkExist) {
                            const dynamicData = {};
                            dynamicData[`${key}_${postData?.org_id}`] = await this.translatorService.frontendReadTranslation(req.lang,'Fitness Videos', `/LC_MESSAGES/Media/Media`,`static`);
                            await this.translatorService.DynamicEngJsonData('Common', postData?.org_id, dynamicData,'Edit','Menu');
                        } else {
                            const dynamicData = {};
                            dynamicData[`${key}_${postData?.org_id}`] = await this.translatorService.frontendReadTranslation(req.lang,'Media', `/LC_MESSAGES/Media/Media`,`static`);
                            await this.translatorService.DynamicEngJsonData('Common', postData?.org_id, dynamicData,'Edit','Menu');
                        }
                    }
                }
            }
            Side bar media name change check category not exist and name blank then Fitness Video default name show end */
            
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? "Categories status updated successfully" : "Category has been updated successfully"),
            });
        } catch (error) {
            if (file && file.fieldname === 'img' && file.filename) {
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: CategoryListInput) {
        try {
            const where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.ORGADMIN,appConstant.ROLE.ADMIN].includes(req.tokenUser?.role_id)) ? { } : { parent_id: IsNull()};
            if(postData?.org_id){
                /* both org_id and 0 condition add*/
                where['org_id'] = In([postData?.org_id,0]);
                where['status'] = 1;
            }
            if(postData?.layout_type != undefined || postData?.layout_type != null){
                where['layout_type'] = postData?.layout_type;
            }
            let resultedData = await this.mediaCategoryService.listRecord(where,'fc.id','ASC');
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MediaCategoryDto, resultedData, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        if (ele.title) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `category_title_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['id']}`, `dynamic`);
                            ele.title = (customName == '' || customName == `category_title_${ele['id']}`) ? ele['title'] : customName;
                        }
                    }));
                }
            }
            let data = [];
            if (req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN) {
                let processedIds = new Set();
                async function processElement(element) {
                  if (!processedIds.has(element.id)) {
                    processedIds.add(element.id);
                    let childElements = await this.mediaCategoryService.listRecord({ parent_id: element.id, status: 1 },'fc.id','ASC');
                    let elements = [element];
                    if (childElements.length > 0) {
                      for (let childElement of childElements) {
                        childElement.title = `${element.title.match(/^_+/)??''}_${childElement.title}`;
                        let childData = await processElement.call(this, childElement);
                        elements = elements.concat(childData);
                      }
                    }
                    return elements;
                  }
                  return [];
                }
                for (let element of resultedData) {
                    if (element.parent_id == null) {
                        let elementData = await processElement.call(this, element);
                        data = data.concat(elementData);
                    }
                } 
            }
             if(req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN && postData?.post){
                if (resultedData) {
                    resultedData = resultedData.filter(ele => 
                        (
                            (
                            (ele.layout_type != undefined || ele.layout_type != null) && 
                            ele.layout_type !== 1 && 
                            ele.layout_type !== 2 && 
                            !ele.parent_id
                            ) 
                            || 
                            (
                                (ele.layout_type != undefined || ele.layout_type != null) && 
                                ( ele.layout_type == 1 || ele.layout_type == 2 )
                                && ele.parent_id
                            )  
                            || 
                            (ele.layout_type == 0)
                        )
                    );
                }
                if (data) {
                    data = data.filter(ele => 
                        (
                            (
                            (ele.layout_type != undefined || ele.layout_type != null) && 
                            ele.layout_type !== 1 && 
                            ele.layout_type !== 2 && 
                            !ele.parent_id
                            ) 
                            || 
                            (
                                (ele.layout_type != undefined || ele.layout_type != null) && 
                                ( ele.layout_type == 1 || ele.layout_type == 2 )
                                && ele.parent_id
                            )  
                            || 
                            (ele.layout_type == 0)
                        )
                    );
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: data.length ? data : resultedData,
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
    @Post('category-list')
    async categoryList(@Req() req: Request, @Res() res: Response, @Body() postData: CategoryListInput) {
        try {
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if(!postData?.id || !postData?.org_id || !['0', '1', '2', '3'].includes(postData?.layout_type)){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let hourTrans = await this.translatorService.frontendReadTranslation(req.lang, 'Hr');
            let minuteTrans = await this.translatorService.frontendReadTranslation(req.lang, 'Min');
            let array = [];
            const category = async (id) =>  {
                let where: any = {parent_id: id, org_id: postData?.org_id, status: 1}
                let resultedData = await this.mediaCategoryService.listRecord(where,'fc.id','ASC');
                if (resultedData.length > 0) {
                    await categoryData(resultedData);
                } else {
                    where = {id: id, org_id: postData?.org_id, status: 1}
                    if (postData?.layout_type == '2') {
                        let resultedData = await this.mediaCategoryService.listRecord(where,'fc.id','DESC',tableConstant.MEDIA_FITNESS.TBL_ME_POST);
                        resultedData = <any>(
                            await this.commonArrayService.formatToDto(MediaCategoryDto, resultedData, req.lang)
                        );
                        if(resultedData && resultedData.length){
                            await Promise.all(resultedData.map(async (ele)=>{
                                if(ele.title){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['id']}`,`dynamic`);
                                    ele.title = (customName == '' || customName == `category_title_${ele['id']}`) ? ele['title'] : customName;
                                }
                            }));
                        }
                        if (resultedData[0]) {
                            await addSubmenu(array, resultedData[0].id, resultedData,true);
                        }
                        return true;
                    }
                    if (['0','1'].includes(postData?.layout_type)) {
                        let resultedData: any = await this.mediaCategoryService.listRecord(where,'fc.id','DESC',tableConstant.MEDIA_FITNESS.TBL_ME_POST);
                        resultedData = <any>(
                            await this.commonArrayService.formatToDto(MediaCategoryDto, resultedData, req.lang)
                        );
                        if(resultedData && resultedData.length){
                            await Promise.all(resultedData.map(async (ele)=>{
                                if(ele.title){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['id']}`,`dynamic`);
                                    ele.title = (customName == '' || customName == `category_title_${ele['id']}`) ? ele['title'] : customName;
                                }
                            }));
                        }
                        if (resultedData[0]) {
                            await addSubmenu(array, resultedData[0].id, resultedData);
                            if (array.length == 0 && postData?.layout_type == '0') {
                                array = resultedData[0]?.post
                                await addSubmenu([{id: resultedData[0].id}],resultedData[0].id,resultedData);
                            }
                        }
                        return true;
                    }
                }
            }
            const addSubmenu = async (array, id, submenuToAdd, lastMenu: boolean = false) => {
                let status = false;
                for (let item of array) {
                    if (item.id === id) {
                        if(submenuToAdd && submenuToAdd.length){
                            for(let ele of submenuToAdd){
                                if(ele.post && ele.post.length){
                                    for(let post of ele.post){
                                        if(post.time && !post.time.includes(`${minuteTrans}`)){
                                            post.time = `${post.time.split(':')[0]} ${hourTrans} : ${post.time.split(':')[1]} ${minuteTrans}`
                                        }
                                        if(post.title){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${id}_${post.id}`, `/LC_MESSAGES/Media/Media/${postData?.org_id}/${id}`,`dynamic`);
                                            post.title = (customName == '' || customName == `post_title_${id}_${post.id}`) ? post.title : customName;
                                        }
                                        if(post.link_title){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_linktitle_${id}_${post.id}`, `/LC_MESSAGES/Media/Media/${postData?.org_id}/${id}`,`dynamic`);
                                            post.link_title = (customName == '' || customName == `post_linktitle_${id}_${post.id}`) ? post.link_title : customName;
                                        }
                                        if(post.short_desc){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_shortdesc_${id}_${post.id}`, `/LC_MESSAGES/Media/Media/${postData?.org_id}/${id}`,`dynamic`);
                                            post.short_desc = (customName == '' || customName == `post_shortdesc_${id}_${post.id}`) ? post.short_desc : customName;
                                        }
                                        if(post.more_desc){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_moredesc_${id}_${post.id}`, `/LC_MESSAGES/Media/Media/${postData?.org_id}/${id}`,`dynamic`);
                                            post.more_desc = (customName == '' || customName == `post_moredesc_${id}_${post.id}`) ? post.more_desc : customName;
                                        }
                                    }
                                }
                                if(ele.time && !ele.time.includes(`${minuteTrans}`)){
                                    ele.time = `${ele.time.split(':')[0]} ${hourTrans} : ${ele.time.split(':')[1]} ${minuteTrans}`
                                }
                            }
                        }
                        if (lastMenu) {
                            item.post = submenuToAdd[0].post;
                        } else {
                            if (!item.submenu) {
                                item.submenu = submenuToAdd;
                            } else {
                                item.submenu.push({ ...submenuToAdd[0] });
                            }
                        }
                        return true; /* Stop further search once item is found and updated */
                    }
                    /* Skip recursion if no submenu exists */
                    if (!item.submenu) continue;
                    /* Recursively search in nested submenu */
                    status = await addSubmenu(item.submenu, id, submenuToAdd, lastMenu);
                    if (status) return true; /*If found in recursion, stop here*/
                }
                return false; /* Not found in this branch */
            };
            const categoryData = async (data) =>  {
                for (let result of data) {
                    if(result.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${result.id}`, `/LC_MESSAGES/Media/Media/${postData?.org_id}/${result['id']}`,`dynamic`);
                        result.title = (customName == '' || customName == `category_title_${result.id}`) ? result['title'] : customName;
                    }
                    let status = await addSubmenu(array, result.parent_id, [{ title: result.title, id: result.id }]);
                    if (status === false) {
                        array.push({ title: result.title, id: result.id })
                    }
                    await category(result.id)
                }
            }
            await category(postData?.id)
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: array,
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
    async getParent(id, concatenatedString =[], req) {
        try {
            const record =  await this.mediaCategoryService.findOne({ id: id });
            if (record) {
                if(record.title){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${record['id']}`, `/LC_MESSAGES/Media/Media/${record['org_id']}/${record['id']}`,`dynamic`);
                    record.title = (customName == '' || customName == `category_title_${record['id']}`) ? record['title'] : customName;
                }
                if (record.parent_id) {
                    concatenatedString.push(record?.title ?? '')
                    return await this.getParent(record.parent_id, concatenatedString, req)
                } else {
                    concatenatedString.push(record?.title ?? '')
                    record['concatenatedString'] = concatenatedString;
                    return record;
                }
            }
            return null;
        } catch (error) {
            console.error("Error fetching record:", error);
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
        }
    }
    async updateStatus(id, status, req) {
        try {
            const record =  await this.mediaCategoryService.findOne({ parent_id: id });
            if (record?.parent_id) {
                await this.mediaCategoryService.update({parent_id: record.parent_id, status: Not(2)},{status: status, updated_by: req.tokenUser?.id});
                this.activityLogService.create(record, {status: status, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_CATEGORY, req.tokenUser?.id);
                let mediaPost = await this.mediaPostService.findOne({cat_id: record.id});
                if (mediaPost) {
                    await this.mediaPostService.update({cat_id: record.id, status: Not(2)},{status: status, updated_by: req.tokenUser?.id});
                    this.activityLogService.create(mediaPost, {status: status, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_POST, req.tokenUser?.id);
                }
                return await this.updateStatus(record.id, status, req)
            }
            return null;
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
        }
    }
}