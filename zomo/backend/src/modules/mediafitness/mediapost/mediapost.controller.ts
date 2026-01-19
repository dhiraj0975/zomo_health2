import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, MediaPostDto, tableConstant } from '@common-constants';
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
    UseGuards, UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { fileName, imgFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { PaginationWithMediaFitnessInput } from '../input';
import { MediaCategoryService } from "../mediacategory/mediacategory.service";
import { CreateMediaPostInput } from './input';
import { MediaPostService } from "./mediapost.service";
const path = require('path');
@Controller('media/post')
@UseGuards(TokenGuard, RoleGuard)
export class MediaPostController {
    constructor(
        private readonly mediaPostService: MediaPostService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly mediaCategoryService: MediaCategoryService,
        private readonly activityLogService: ActivityLogService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationWithMediaFitnessInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) ? 'media.status != 2 ' : 'media.status = 1 ';
            if(postData?.org_id){
                where +=`AND media.org_id = '${postData?.org_id}' `;
            }
            if(postData?.cat_id){
                where +=`AND media.cat_id = '${postData?.cat_id}' `;
            }
            if(postData?.activity_id){
                where +=`AND media.activity_id = '${postData?.activity_id}' `;
            }
            if (postData?.search_str) {
                where += `AND(media.title LIKE '%${postData?.search_str}%' OR media.post_img LIKE '%${postData?.search_str}%' OR media.display_area LIKE '%${postData?.search_str}%' OR media.short_desc LIKE '%${postData?.search_str}%' OR media.more_desc LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.mediaPostService.paginateList(
                where,
                postData,
            );
            if (req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN) {
                await Promise.all(resultedData['list'].map(async (element)=>{
                    if (element?.category?.parent_id == null || element?.category?.parent_id == undefined) {
                        element['category_heirarchy'] = element.category.title;
                    }
                    else{
                        let categoryParent = await this.getParent(element.category.id, [], req);
                        element['category_heirarchy'] = categoryParent?.concatenatedString ? categoryParent?.concatenatedString.slice().reverse().join(' -> ') : '';
                    }
                }));
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MediaPostDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${ele['cat_id']}_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.title = (customeName == '' || customeName == `post_title_${ele['cat_id']}_${ele['id']}`) ? ele['title'] : customeName;
                    }
                    if(ele.link_title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_linktitle_${ele['cat_id']}_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.link_title = (customeName == '' || customeName == `post_linktitle_${ele['cat_id']}_${ele['id']}`) ? ele['link_title'] : customeName;
                    }
                    if(ele.short_desc){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_shortdesc_${ele['cat_id']}_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.short_desc = (customeName == '' || customeName == `post_shortdesc_${ele['cat_id']}_${ele['id']}`) ? ele['short_desc'] : customeName;
                    }
                    if(ele.more_desc){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_moredesc_${ele['cat_id']}_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.more_desc = (customeName == '' || customeName == `post_moredesc_${ele['cat_id']}_${ele['id']}`) ? ele['more_desc'] : customeName;
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
            let mediaPost = await this.mediaPostService.findOne(where);
            if (!mediaPost) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            mediaPost = <any>(
                await this.commonArrayService.formatToDto(MediaPostDto, mediaPost, req.lang)
            );
            if(mediaPost.title){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${mediaPost['cat_id']}_${mediaPost['id']}`, `/LC_MESSAGES/Media/Media/${mediaPost['org_id']}/${mediaPost['cat_id']}`,`dynamic`);
                mediaPost.title = (customeName == '' || customeName == `post_title_${mediaPost['cat_id']}_${mediaPost['id']}`) ? mediaPost['title'] : customeName;
            }
            if(mediaPost.link_title){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_linktitle_${mediaPost['cat_id']}_${mediaPost['id']}`, `/LC_MESSAGES/Media/Media/${mediaPost['org_id']}/${mediaPost['cat_id']}`,`dynamic`);
                mediaPost.link_title = (customeName == '' || customeName == `post_linktitle_${mediaPost['cat_id']}_${mediaPost['id']}`) ? mediaPost['link_title'] : customeName;
            }
            if(mediaPost.short_desc){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_shortdesc_${mediaPost['cat_id']}_${mediaPost['id']}`, `/LC_MESSAGES/Media/Media/${mediaPost['org_id']}/${mediaPost['cat_id']}`,`dynamic`);
                mediaPost.short_desc = (customeName == '' || customeName == `post_shortdesc_${mediaPost['cat_id']}_${mediaPost['id']}`) ? mediaPost['short_desc'] : customeName;
            }
            if(mediaPost.more_desc){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_moredesc_${mediaPost['cat_id']}_${mediaPost['id']}`, `/LC_MESSAGES/Media/Media/${mediaPost['org_id']}/${mediaPost['cat_id']}`,`dynamic`);
                mediaPost.more_desc = (customeName == '' || customeName == `post_moredesc_${mediaPost['cat_id']}_${mediaPost['id']}`) ? mediaPost['more_desc'] : customeName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: mediaPost,
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
        FileFieldsInterceptor(
            [
                { name: 'post_img', maxCount: 1 },
                { name: 'display_area', maxCount: 1 },
            ],
            {
                limits: { fileSize: appConstant.FILE_SIZE },
                storage: diskStorage({
                    destination: `${appConstant.FITNESS_IMAGE_PATH}`,
                    filename: fileName,
                }),
                fileFilter: imgFilter,
            },
        ),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaPostInput, @UploadedFiles() files: Record<string, Express.Multer.File>) {
        try {
            postData['display_type'] = postData?.display_type ?? 0;
            postData['atime'] = postData?.atime ?? 0;
            postData['atime_type'] = postData?.atime_type ?? 0;
            if(postData?.time){
                postData['atime'] = this.commonDateService.timeToMinutes(postData?.time); 
                if(postData['atime'] > 60){
                    postData['atime_type'] = 0; 
                }
                else if(postData['atime'] == 60){
                    postData['atime'] = 1;
                    postData['atime_type'] = 1; 
                }
                else{
                    postData['atime_type'] = 0; 
                }
                delete postData?.time;
            }
            postData['short_desc'] = postData?.short_desc ?? ' ';
            postData['more_desc'] = postData?.more_desc ?? ' ';
            if (
                !postData?.org_id ||
                !postData?.cat_id ||
                !postData?.title ||
                (postData?.display_type == undefined || postData?.display_type == null) ||
                (postData?.atime == undefined || postData?.atime == null) ||
                (postData?.short_desc == undefined || postData?.short_desc == null) ||
                (postData?.more_desc == undefined || postData?.more_desc == null) 
            ) {
                if (files && files.post_img && files.post_img[0].fieldname === 'post_img' && files.post_img[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.post_img[0].path);
                }
                if (files && files.display_area && files.display_area[0].fieldname === 'display_area' && files.display_area[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.display_area[0].path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = { org_id: postData?.org_id, title: postData?.title, status: 1 };
            if(postData?.cat_id){
                where['cat_id'] = postData?.cat_id;
            }
            const categoryCheck = await this.mediaPostService.findOne(where);
            if (categoryCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This title has already been used in same category."));
            }
            postData['post_img'] = '';
            let resultedData = await this.mediaPostService.save({...postData,
                created_by: req.tokenUser?.id,
                updated_by: req.tokenUser?.id
            });
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `post_title_${resultedData['cat_id']}_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }
            if(postData?.link_title){
                let link_title = `post_linktitle_${resultedData['cat_id']}_${resultedData['id']}`
                dynamicDatas[`${link_title}`]= postData?.link_title;
            }
            if(postData?.short_desc && postData?.short_desc != ' '){
                let tilte = `post_shortdesc_${resultedData['cat_id']}_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.short_desc;
            }           
            if(postData?.more_desc && postData?.more_desc != ' '){
                let tilte = `post_moredesc_${resultedData['cat_id']}_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.more_desc;
            }           
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Media',resultedData['cat_id']);
            if (files && files.post_img &&  files?.post_img[0]?.fieldname === 'post_img' && files?.post_img[0]?.filename) {
                files.post_img[0].originalname = this.commonFileService.formatFileName(files.post_img[0].originalname);
                let filename = `media/post/${postData?.org_id}/mepost_` + this.commonService.generateMD5(resultedData['id'].toString()) + '_' + files.post_img[0].originalname;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.post_img[0].path),  filename: filename}));
                postData['post_img'] = filename;
            }
            if (files && files.display_area && files?.display_area[0]?.fieldname === 'display_area' && files?.display_area[0]?.filename) {
                files.display_area[0].originalname = this.commonFileService.formatFileName(files.display_area[0].originalname);
                let filename = `media/post/${postData?.org_id}/post/mepattc` + this.commonService.generateMD5(resultedData['id'].toString()) + '_' + files.display_area[0].originalname;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.display_area[0].path),  filename: filename}));
                postData['display_area'] = filename;
            }
            if(files && (files.post_img || files?.display_area)){
                await this.mediaPostService.update({id: resultedData['id']},{...postData});
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Post has been added successful")
            });
        } catch (error) {
            if (files && files.post_img && files.post_img[0].fieldname === 'post_img' && files.post_img[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.post_img[0].path);
            }
            if (files && files.display_area && files.display_area[0].fieldname === 'display_area' && files.display_area[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.display_area[0].path);
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
            const recordDetails = await this.mediaPostService.findOne(where);
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
            await this.mediaPostService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_POST, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Post has been deleted successfully"),
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
        FileFieldsInterceptor(
            [
                { name: 'post_img', maxCount: 1 },
                { name: 'display_area', maxCount: 1 },
            ],
            {
                limits: { fileSize: appConstant.FILE_SIZE },
                storage: diskStorage({
                    destination: `${appConstant.FITNESS_IMAGE_PATH}`,
                    filename: fileName,
                }),
                fileFilter: imgFilter,
            },
        ),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaPostInput, @UploadedFiles() files: Record<string, Express.Multer.File>) {
        try {
            if(postData?.time){
                postData['atime'] = this.commonDateService.timeToMinutes(postData?.time); 
                if(postData['atime'] >= 60){
                    postData['atime_type'] = 0; 
                }
                else if(postData['atime'] == 60){
                    postData['atime'] = 1;
                    postData['atime_type'] = 1; 
                }
                else{
                    postData['atime_type'] = 0; 
                }
                delete postData?.time;
            }
            if (
                !postData?.id
            ) {
                if (files && files.post_img && files.post_img[0].fieldname === 'post_img' && files.post_img[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.post_img[0].path);
                }
                if (files && files.display_area && files.display_area[0].fieldname === 'display_area' && files.display_area[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.display_area[0].path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.mediaPostService.findOne(where);
            if (!recordDetails) {
                await this.mediaPostService.save({
                    ...postData,
                    created_by: req.tokenUser?.id,
                    updated_by: req.tokenUser?.id
                });
            }
            if (files && files.post_img  && files.post_img[0].fieldname === 'post_img' && files.post_img[0].filename) {
                files.post_img[0].originalname = this.commonFileService.formatFileName(files.post_img[0].originalname);
                let filename = `media/post/${postData?.org_id}/mepost_` + this.commonService.generateMD5(recordDetails['id'].toString()) + '_' + files.post_img[0].originalname;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.post_img[0].path),  filename: filename}));
                postData['post_img'] = filename;
            }
            if (files && files.display_area && files.display_area[0].fieldname === 'display_area' && files.display_area[0].filename) {
                files.display_area[0].originalname = this.commonFileService.formatFileName(files.display_area[0].originalname);
                let filename = `media/post/${postData?.org_id}/post/mepattc` + this.commonService.generateMD5(recordDetails['id'].toString()) + '_' + files.display_area[0].originalname;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.display_area[0].path),  filename: filename}));
                postData['display_area'] = filename;
            }
            delete postData?.time;
            await this.mediaPostService.update(where, {...postData, updated_by: req.tokenUser?.id});
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `post_title_${postData?.cat_id ?? recordDetails['cat_id']}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }
            if(postData?.link_title){
                let link_title = `post_linktitle_${postData?.cat_id ?? recordDetails['cat_id']}_${recordDetails['id']}`
                dynamicDatas[`${link_title}`]= postData?.link_title;
            }
            if(postData?.short_desc && postData?.short_desc != ' '){
                let tilte = `post_shortdesc_${postData?.cat_id ?? recordDetails['cat_id']}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.short_desc;
            }           
            if(postData?.more_desc && postData?.more_desc != ' '){
                let tilte = `post_moredesc_${postData?.cat_id ?? recordDetails['cat_id']}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.more_desc;
            }
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Media',postData?.cat_id || recordDetails['cat_id']);
            this.activityLogService.create(recordDetails, {...postData, updated_by: req.tokenUser?.id}, tableConstant.MEDIA_FITNESS.TBL_ME_POST, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? "Post status updated successfully" : "Post has been updated successfully"),
            });
        } catch (error) {
            if (files && files.post_img && files.post_img[0].fieldname === 'post_img' && files.post_img[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.post_img[0].path);
            }
            if (files && files.display_area && files.display_area[0].fieldname === 'display_area' && files.display_area[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.display_area[0].path);
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
            const where = { status: 1 };
            let resultedData = await this.mediaPostService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MediaPostDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${ele['cat_id']}_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.title = (customeName == '' || customeName == `post_title_${ele['cat_id']}_${ele['id']}`) ? ele['title'] : customeName;
                    }
                    if(ele.link_title){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_linktitle_${ele['cat_id']}_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.link_title = (customeName == '' || customeName == `post_linktitle_${ele['cat_id']}_${ele['id']}`) ? ele['link_title'] : customeName;
                    }
                    if(ele.short_desc){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_shortdesc_${ele['cat_id']}_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.short_desc = (customeName == '' || customeName == `post_shortdesc_${ele['cat_id']}_${ele['id']}`) ? ele['short_desc'] : customeName;
                    }
                    if(ele.more_desc){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`post_moredesc_${ele['cat_id']}_${ele['id']}`, `/LC_MESSAGES/Media/Media/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.more_desc = (customeName == '' || customeName == `post_moredesc_${ele['cat_id']}_${ele['id']}`) ? ele['more_desc'] : customeName;
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
    async getParent(id, concatenatedString =[], req) {
        try {
            const record =  await this.mediaCategoryService.findOne({ id: id });
            if (record) {
                if(record.title){
                    let customeName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${record['id']}`, `/LC_MESSAGES/Media/Media/${record['org_id']}/${record['id']}`,`dynamic`);
                    record.title = (customeName == '' || customeName == `category_title_${record['id']}`) ? record['title'] : customeName;
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
}