import { appConstant, CommonArrayService, CommonFileService, CommonService, tableConstant, WellBeingCategoryDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { IsNull, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateWellBeingCategoryInput, PaginateWithEmotionalWellBeingInput } from "../../../input";
import { fileName, imgFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { FrontService } from "../front/front.service";
import { WellBeingPostService } from "../wellbeingpost/wellbeingpost.service";
import { WellBeingCategoryService } from "./wellbeingcategory.service";
const path = require('path');
@Controller('emotional-wellbeing/category')
@UseGuards(TokenGuard, RoleGuard)
export class WellBeingCategoryController {
    constructor(
        private readonly wellbeingCategoryService: WellBeingCategoryService,
        private readonly wellbeingPostService: WellBeingPostService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly frontService: FrontService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithEmotionalWellBeingInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.ORGADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) ? 'wellbeing.status !=2 ' : 'wellbeing.status =1 ';
            if(postData?.org_id){
                where += `AND wellbeing.org_id = ${postData?.org_id} `
            }
            if(postData?.parent_id){
                where += `AND wellbeing.parent_id = ${postData?.parent_id} `
            }
            if (postData?.search_str) {
                if(postData?.search_str.includes(' -> ')){
                    postData.search_str = postData?.search_str.split(' -> ')[0];
                }
                switch (postData?.search_str.trim()) {
                    case "Block Layout":
                        where += `AND wellbeing.layout_type = 0`;
                        break;
                    case "Left Layout":
                        where += `AND wellbeing.layout_type = 2`;
                        break;
                    case "Tab Layout":
                        where += `AND wellbeing.layout_type = 1`;
                        break;
                    default:
                        where += `AND(wellbeing.title LIKE '%${postData?.search_str}%' OR wellbeing.description LIKE '%${postData?.search_str}%' OR category.title LIKE '%${postData?.search_str}%')`;
                }
            }
            const resultedData = await this.wellbeingCategoryService.paginateList(
                where,
                postData,
            );
            if (req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN) {
                await Promise.all(resultedData['list'].map(async (element)=>{
                    if (element?.parent_id == null || element?.parent_id == undefined) {
                        element['category_heirarchy'] = element?.title;
                    }
                    else{
                        let categoryParent = await this.getParent(element.id,[],req);
                        element['category_heirarchy'] = categoryParent?.concatenatedString ? categoryParent?.concatenatedString.slice().reverse().join(' -> ') : '';
                    }
                }));
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(WellBeingCategoryDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${ele['id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['id']}`,`dynamic`);
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
            let categoryData = await this.wellbeingCategoryService.findOne(where,'wbc.id','DESC');
            if (!categoryData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            categoryData = <any>(
                await this.commonArrayService.formatToDto(WellBeingCategoryDto, categoryData, req.lang)
            );
            if(categoryData.title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${categoryData['id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${categoryData['org_id']}/${categoryData['id']}`,`dynamic`);
                categoryData.title = (customName == '' || customName == `category_title_${categoryData['id']}`) ? categoryData['title'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: categoryData,
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
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.WELLBEING_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateWellBeingCategoryInput, @UploadedFile() file: Express.Multer.File) {
        try {            
            postData['description'] = postData?.description ?? ' ';
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
            postData['img'] = '';
            if (file && file.fieldname === 'img' && file.filename) {
                postData['img'] = '/wellbeing/' + file.filename;
            }
            if(postData?.parent_id == 0){
                postData['parent_id'] = null;
            }
            let payload = {
                title: postData?.title,
                org_id: postData?.org_id,
                layout_type: postData?.layout_type,
            };
            if(postData?.parent_id){
                payload['parent_id'] = postData?.parent_id;
            }
            let recordDetails: any = await this.wellbeingCategoryService.findOne({...payload, status: Not(2)});
            if (recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "This title has already been used in same level.");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            }
            // will remove this function after old system removal
            recordDetails = await this.wellbeingCategoryService.saveNew({...postData,
                created_by: req.tokenUser?.id,
                updated_by : req.tokenUser?.id
            }, postData?.parent_id)
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `category_title_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }           
            await this.translatorService.DynamicEngJsonData('Emotionalwellbeing',recordDetails['org_id'],dynamicDatas,'Edit','Emotionalwellbeing',recordDetails['id']);
            if (file && file.fieldname === 'img' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `emocat/${postData?.org_id}/emocat_${this.commonService.generateMD5(recordDetails['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                // for thumbnail
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                await this.wellbeingCategoryService.update({ id: recordDetails['id']},{img: filename});
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Category has been added successful',
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
            const recordDetails = await this.wellbeingCategoryService.findOne(where,'wbc.id','DESC');
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
            await this.wellbeingCategoryService.update(where, {status : 2, updated_by: req.tokenUser?.id});
            this.activityLogService.create(recordDetails, {status : 2, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY, req.tokenUser?.id, 'delete');
            postData['status'] = 2;
            if((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status){
                await this.wellbeingCategoryService.update({id: postData.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                this.activityLogService.create(recordDetails, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY, req.tokenUser?.id);
                let wellbeingPost = await this.wellbeingPostService.findOne({cat_id: postData.id},['id','status']);
                if (wellbeingPost) {
                    await this.wellbeingPostService.update({cat_id: postData.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                    this.activityLogService.create(wellbeingPost, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST, req.tokenUser?.id);
                }
                const wellbeingCategory = await this.wellbeingCategoryService.listRecord(`wbc.parent_id = ${postData?.id} AND wbc.status != 2`);
                for(let ele of wellbeingCategory){
                    await this.wellbeingCategoryService.update({id: ele.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                    this.activityLogService.create(ele, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY, req.tokenUser?.id);
                    let wellbeingPost = await this.wellbeingPostService.findOne({cat_id: ele.id},['id','status']);
                    if (wellbeingPost) {
                        await this.wellbeingPostService.update({cat_id: ele.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                        this.activityLogService.create(wellbeingPost, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST, req.tokenUser?.id);
                    }
                    await this.updateStatus(ele.id, postData.status, req);
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Category has been deleted successful',
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
        FileInterceptor("img", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.WELLBEING_PATH}`,
                filename: fileName
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateWellBeingCategoryInput, @UploadedFile() file: Express.Multer.File) {
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
            const recordDetails = await this.wellbeingCategoryService.findOne(where,'wbc.id','DESC');
            if (!recordDetails) {
                await this.wellbeingCategoryService.save({
                    ...postData,
                    created_by: req.tokenUser?.id,
                    updated_by : req.tokenUser?.id
                });
            }
            if (file && file.fieldname === 'img' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `emocat/${postData?.org_id}/emocat_${this.commonService.generateMD5(recordDetails['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                // for thumbnail
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                postData['img'] = filename;
            }
            if((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status){
                await this.wellbeingCategoryService.update({id: postData.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                this.activityLogService.create(recordDetails, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY, req.tokenUser?.id);
                let wellbeingPost = await this.wellbeingPostService.findOne({cat_id: postData.id},['id','status']);
                if (wellbeingPost) {
                    await this.wellbeingPostService.update({cat_id: postData.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                    this.activityLogService.create(wellbeingPost, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST, req.tokenUser?.id);
                }
                const wellbeingCategory = await this.wellbeingCategoryService.listRecord(`wbc.parent_id = ${postData?.id} AND wbc.status != 2`);
                for(let ele of wellbeingCategory){
                    await this.wellbeingCategoryService.update({id: ele.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                    this.activityLogService.create(ele, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY, req.tokenUser?.id);
                    let wellbeingPost = await this.wellbeingPostService.findOne({cat_id: ele.id},['id','status']);
                    if (wellbeingPost) {
                        await this.wellbeingPostService.update({cat_id: ele.id, status: Not(2)},{status: postData.status, updated_by: req.tokenUser?.id});
                        this.activityLogService.create(wellbeingPost, {status: postData.status, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST, req.tokenUser?.id);
                    }
                    await this.updateStatus(ele.id, postData.status, req);
                }
            }
            if(postData?.parent_id == 0){
                postData['parent_id'] = null;
            }
            if(postData?.parent_id == postData?.id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_VALUE"));
            }
            if(postData?.parent_id && !recordDetails.parent_id){
                const recordDetails = await this.wellbeingCategoryService.findOne({id: postData?.parent_id, status: Not(2)},'wbc.id','DESC');
                if(recordDetails.parent_id && recordDetails?.parent_id !=0){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_VALUE"));
                }
            }else{
                const recordDetail = await this.wellbeingCategoryService.listRecord({parent_id: recordDetails.id, status: Not(2)},'wbc.id','DESC');
                let data = recordDetail.map(ele => ele.id == postData?.parent_id).includes(true);
                if(data){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_INVALID_VALUE"));
                }
            }
            if(postData?.parent_id && recordDetails?.parent_id && postData?.parent_id != recordDetails?.parent_id){
                await this.wellbeingCategoryService.updateNew({...postData, updated_by : req.tokenUser?.id }, postData?.parent_id);
            }
            else{
                await this.wellbeingCategoryService.update(where, {...postData, updated_by : req.tokenUser?.id });
            }
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `category_title_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }           
            await this.translatorService.DynamicEngJsonData('Emotionalwellbeing',recordDetails['org_id'],dynamicDatas,'Edit','Emotionalwellbeing',recordDetails['id']);
            this.activityLogService.create(recordDetails, postData, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? "Category status updated successfully" : "Category has been updated successfully"),
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
    async processCategoryData(recordDetails, postData, req) {
        try{
            for (let ele of recordDetails) {
                if (ele.parent_id && postData?.status == 1) {
                    const categoryData = await this.wellbeingCategoryService.listRecord({ id: ele.parent_id, status: Not(2) });
                    await this.processParentCategoryData(categoryData, postData, req);
                }
                const categoryData = await this.wellbeingCategoryService.listRecord({ parent_id: ele.id, status: Not(2) });
                await this.wellbeingCategoryService.update(
                    { parent_id: ele.id, status: Not(2) },
                    { status: postData?.status, updated_by: req.tokenUser?.id }
                );
                categoryData.forEach((category) => {
                    this.activityLogService.create(category, { status: postData?.status, updated_by: req.tokenUser?.id }, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY, req.tokenUser?.id, 'delete');
                });
                if (categoryData.length > 0) {
                    return await this.processCategoryData(categoryData, postData, req);
                }
            }
            return
        }catch(error) {
            throw new Error(error?.message);
        }
    }
    async processParentCategoryData(recordDetails, postData, req) {
        try{
            for (let ele of recordDetails) {
                if(ele.parent_id && postData?.status == 1){
                    const categoryData = await this.wellbeingCategoryService.listRecord({ id: ele.parent_id, status: Not(2) });
                    await this.wellbeingCategoryService.update(
                        { id: ele.parent_id, status: Not(2) },
                        { status: postData?.status, updated_by: req.tokenUser?.id }
                    );
                    if (categoryData.length > 0) {
                        return await this.processParentCategoryData(categoryData, postData, req);
                    }
                }
            }
        }catch(error) {
            throw new Error(error?.message);
        }
    }
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = (req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN || req.tokenUser?.role_id == appConstant.ROLE.ADMIN) ? { } : { parent_id: IsNull()};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
                where['status'] = 1;
            }
            if(postData?.layout_type != undefined || postData?.layout_type != null){
                where['layout_type'] = postData?.layout_type;
            }
            let resultedData = await this.wellbeingCategoryService.listRecord(where,'wbc.id','ASC');
            resultedData = <any>(
                await this.commonArrayService.formatToDto(WellBeingCategoryDto, resultedData, req.lang)
            );
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        if (ele.title) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `category_title_${ele['id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['id']}`, `dynamic`);
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
                    let childElements = await this.wellbeingCategoryService.listRecord({ parent_id: element.id, status: 1 });
                    let elements = [element];
                    if (childElements.length > 0) {
                      for (let childElement of childElements) {
                        if(childElement.title){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${childElement['id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${childElement['org_id']}/${childElement['id']}`,`dynamic`);
                            childElement.title = (customName == '' || customName == `category_title_${childElement['id']}`) ? childElement['title'] : customName;
                        }
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
    async categoryList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
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
                let resultedData = await this.wellbeingCategoryService.listRecord(where,'wbc.id','ASC');
                if (resultedData.length > 0) {
                    await categoryData(resultedData);
                } else {
                    where = {id: id, org_id: postData?.org_id, status: 1}
                    if (postData?.layout_type == '2') {
                        let resultedData = await this.wellbeingCategoryService.listRecord(where,'wbc.id','DESC',tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST);
                        resultedData = <any>(
                            await this.commonArrayService.formatToDto(WellBeingCategoryDto, resultedData, req.lang)
                        );
                        if(resultedData && resultedData.length){
                            await Promise.all(resultedData.map(async (ele)=>{
                                if(ele.title){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${ele['id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['id']}`,`dynamic`);
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
                        let resultedData: any = await this.wellbeingCategoryService.listRecord(where,'wbc.id','DESC',tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST);
                        resultedData = <any>(
                            await this.commonArrayService.formatToDto(WellBeingCategoryDto, resultedData, req.lang)
                        );
                        if(resultedData && resultedData.length){
                            await Promise.all(resultedData.map(async (ele)=>{
                                if(ele.title){
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${ele['id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['id']}`,`dynamic`);
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
                                if (ele.title) {
                                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `category_title_${ele['id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['id']}`, `dynamic`);
                                    ele.title = (customName == '' || customName == `category_title_${ele['id']}`) ? ele['title'] : customName;
                                }
                                if(ele.post && ele.post.length){
                                    for(let post of ele.post){
                                        if(post.title){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${id}_${post.id}_${post.org_id}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${postData?.org_id}/${id}`,`dynamic`);
                                            post.title = (customName == '' || customName == `post_title_${id}_${post.id}_${post.org_id}`) ? post.title : customName;
                                        }
                                        if(post.link_title){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_linktitle_${id}_${post.id}_${post.org_id}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${postData?.org_id}/${id}`,`dynamic`);
                                            post.link_title = (customName == '' || customName == `post_linktitle_${id}_${post.id}_${post.org_id}`) ? post.link_title : customName;
                                        }
                                        if(post.short_desc){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_shortdesc_${id}_${post.id}_${post.org_id}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${postData?.org_id}/${id}`,`dynamic`);
                                            post.short_desc = (customName == '' || customName == `post_shortdesc_${id}_${post.id}_${post.org_id}`) ? post.short_desc : customName;
                                        }
                                        if(post.more_desc){
                                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_moredesc_${id}_${post.id}_${post.org_id}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${postData?.org_id}/${id}`,`dynamic`);
                                            post.more_desc = (customName == '' || customName == `post_moredesc_${id}_${post.id}_${post.org_id}`) ? post.more_desc : customName;
                                        }
                                        if(post.time && !post.time.includes(`${minuteTrans}`)){
                                            post.time = `${post.time.split(':')[0]} ${hourTrans} : ${post.time.split(':')[1]} ${minuteTrans}`
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
                    if (result.title) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `category_title_${result['id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${result['org_id']}/${result['id']}`, `dynamic`);
                        result.title = (customName == '' || customName == `category_title_${result['id']}`) ? result['title'] : customName;
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
            const record =  await this.wellbeingCategoryService.findOne({ id: id });
            if (record) {
                if(record.title){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${record['id']}`, `/LC_MESSAGES/Media/Media/${record['org_id']}/${record['id']}`,`dynamic`);
                    record.title = (customName == '' || customName == `category_title_${record['id']}`) ? record['title'] : customName;
                }
                if (record.parent_id) {
                    concatenatedString.push(record.title)
                    return await this.getParent(record.parent_id, concatenatedString, req)
                } else {
                    concatenatedString.push(record.title)
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
            let record = await this.frontService.wellbeingCategoryFindOne({parent_id: id},['id','parent_id','status']);
            if (record?.parent_id) {
                await this.wellbeingCategoryService.update({parent_id: record.parent_id, status: Not(2)},{status: status, updated_by: req.tokenUser?.id});
                this.activityLogService.create(record, {status: status, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_CATEGORY, req.tokenUser?.id);
                let wellbeingPost = await this.wellbeingPostService.findOne({cat_id: record.id},['id','status']);
                if (wellbeingPost) {
                    await this.wellbeingPostService.update({cat_id: record.id, status: Not(2)},{status: status, updated_by: req.tokenUser?.id});
                    this.activityLogService.create(wellbeingPost, {status: status, updated_by: req.tokenUser?.id}, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST, req.tokenUser?.id);
                }
                return await this.updateStatus(record.id, status, req)
            }
            return null;
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
        }
    }
}