import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, tableConstant, WellBeingPostDto } from '@common-constants';
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
    UseGuards, UseInterceptors
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import * as moment from 'moment-timezone';
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ClientManagerAssignService } from "src/modules/company/clientmanagerassign/clientmanagerassign.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { In } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateWellBeingPostInput, PaginateWithEmotionalWellBeingInput } from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { WellBeingCategoryService } from "../wellbeingcategory/wellbeingcategory.service";
import { WellBeingPostService } from "./wellbeingpost.service";
const path = require('path');
const S3_URL =  process.env.S3_URL_PROD;
@Controller('emotional-wellbeing/post')
@UseGuards(TokenGuard, RoleGuard)
export class WellBeingPostController {
    constructor(
        private readonly wellbeingPostService: WellBeingPostService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly wellbeingCategoryService: WellBeingCategoryService,
        private readonly activityLogService: ActivityLogService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithEmotionalWellBeingInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            postData['role'] = (appConstant.ROLE.ADMIN == req.tokenUser?.role_id  || appConstant.ROLE.ORGADMIN == req.tokenUser?.role_id);
            postData['org_id'] = (appConstant.ROLE.ADMIN == req.tokenUser?.role_id || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id) ? postData?.org_id : postData?.org_id ?? req.tokenUser?.org_id;
            const { ADMIN, ORGADMIN, REGISTERED } = appConstant.ROLE;
            const { org_id, cat_id } = postData;
            if (req.tokenUser?.role_id !== ADMIN && (!org_id || !cat_id)) {
                if ((req.tokenUser?.role_id === ORGADMIN && !org_id) || req.tokenUser?.role_id === REGISTERED) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            let where = (req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN) ? 'wb.status != 2' : 'wb.status = 1';
            let field = ['wb.id', 'wb.org_id', 'wb.cat_id', 'wb.title', 'wb.link_title', 'wb.display_type', 'wb.display_area', 'wb.short_desc', 'wb.more_desc', 'wb.status', 'wb.created_by', 'wb.updated_by', 'wb.post_img', 'wb.created', 'wb.updated'];
            if (!postData['role'] && org_id && cat_id) {
                field = field.concat(['wb.atime', 'wb.atime_type', 'wb.maincollection', 'wb.secondarycategory', 'settings.videofavoriteslist']);
                const sortObj = {
                    1: { order_by: 'wb.title', order: 'ASC' },
                    2: { order_by: 'wb.atime', order: 'ASC' },
                    3: { order_by: 'wb.title', order: 'ASC' },
                    4: { order_by: 'wb.title', order: 'DESC' },
                };
                where += ` AND wb.org_id IN(0,${org_id}) AND wb.cat_id = ${cat_id} `
                    let fileName = `emotional_well_being/json/${org_id.toString()}/${postData?.user_id.toString()}/${this.commonService.generateMD5(req.tokenUser?.code.toString())}${this.commonService.generateMD5(postData?.user_id.toString())}.json`;
                    let dataFileRead = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: fileName}));
                    if (dataFileRead) {
                        const { AcceptRanges, LastModified, ContentLength, ETag, ContentType, ServerSideEncryption, Metadata, Body, ...getData } = dataFileRead;
                        dataFileRead = getData;
                    }
                    else{
                        dataFileRead = {}; 
                    }
                    const validKeys = new Set(['search_str', 'sort_by', 'categories', 'focus', 'equipment']);
                    const isValid = Array.from(validKeys).some(key => 
                        Object.prototype.hasOwnProperty.call(postData, key) && postData[key] !== ''
                    );
                if (isValid) {
                    const { page, limit, order_by, order, org_id, cat_id, user_id, ...searchData } = postData;
                    let dataSave = this.commonFileService.saveUserDetail(searchData,['search_str', 'categories', 'duration_min', 'duration_max', 'sort_by', 'time'],postData?.org_id,appConstant.EMOTIONAL_WELL_BEING_JSON_PATH,req.tokenUser?.code,dataFileRead,['duration_min', 'duration_max', 'sort_by'])
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(dataSave.filePath),  filename: fileName}));
                    if (postData?.categories && postData?.categories !='null') {
                        let categories = this.commonFileService.quoteEscaper(postData?.categories).split(',').join('","')
                        where += ` AND wb.maincollection IN ("${categories}")`
                    }
                    if (postData?.search_str) {
                        where += ` AND (wb.title LIKE "%${this.commonFileService.quoteEscaper(postData?.search_str)}%")`;
                    }
                    if (postData?.duration_min && postData?.duration_max) {
                        where += ` AND wb.atime BETWEEN ${postData?.duration_min} AND ${postData?.duration_max}`
                    }
                } else if (dataFileRead){
                    let dataFileReadList = Object.keys(dataFileRead).reverse().reduce((obj, key) => {
                            obj[key] = dataFileRead[key];
                            return obj;
                        }, {});
                    const properties = ['search_str', 'categories', 'duration_min', 'duration_max', 'sort_by'];
                    for (let date in dataFileReadList) {
                        if (dataFileReadList.hasOwnProperty(date)) {
                            let data;
                            if (Object.prototype.hasOwnProperty.call(dataFileReadList, date)) {
                                data = dataFileReadList[date];
                            }
                          if (Object.keys(postData).length === 0) {
                            postData = data;
                          } else {
                            for (let property of properties) {
                              if (!postData?.hasOwnProperty(property) && data.hasOwnProperty(property)) {
                                postData[property] = data[property];
                                if (Object.keys(postData).length === properties.length) {
                                  break;
                                }
                              }
                            }
                          }
                          if (Object.keys(postData).length === properties.length) {
                            break;
                          }
                        }
                      }
                }
                if ([1, 2, 3, 4, 5].includes(postData?.sort_by)) {
                    if (postData?.sort_by == 5) {
                        postData.saved_videos = true;
                        postData.is_valid = true;
                    } else {
                        const option = sortObj[postData?.sort_by];
                        postData.order_by = option.order_by;
                        postData.order = option.order;
                    }
                }
            } else {
                where += ` AND company.id IS NOT NULL `;
                field = field.concat(['company.id', 'company.company_name']);
                if ([ORGADMIN].includes(req.tokenUser?.role_id)) {
                    where += ` AND wb.created_by != -1  AND wb.updated_by != -1`;
                }else if ([ADMIN].includes(req.tokenUser?.role_id)) {
                    where += ` AND wb.created_by = -1 AND wb.updated_by = -1`;
                }
                if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                    let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                    if(resultedData.length > 0){
                        where += `AND wb.org_id IN (${resultedData.map(ele=>ele.org_id).join(',')})`;
                    }
                    else{
                        return res.status(HttpStatus.OK).json({
                            statusCode: 200,
                            success: 1,
                            error: 0,
                            data: {
                                list: [],
                                limit: postData?.limit,
                                page: postData?.page,
                                pages: 0,
                                total: 0
                            },
                            message: 'success',
                        });
                    }
                }
                if(postData?.org_id){
                    where += ` AND wb.org_id =${org_id} `
                }
                if (postData?.search_str) {
                    if(this.commonDateService.isValidDate(postData?.search_str)){
                        postData.search_str = moment(postData?.search_str, 'MMM DD, YYYY').format('YYYY-MM-DD')
                        where += ` AND (wb.created BETWEEN '${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 00:00:00' AND '${this.commonDateService.getTodayDate(postData?.search_str).format('YYYY-MM-DD')} 23:59:59')`;
                    }
                    else {
                        postData.search_str = this.commonFileService.quoteEscaper(postData?.search_str);
                        if(postData?.search_str.includes(' -> ')){
                            postData.search_str = postData?.search_str.split(' -> ')[0];
                        }
                        if(['Block','Video','Document','Image'].includes(postData?.search_str)){
                            switch (postData?.search_str) {
                                case "Block":
                                    where += ` AND(wb.display_type = 0)`;
                                    break
                                case "Video":
                                    where += ` AND(wb.display_type = 1)`;
                                    break
                                case "Document":
                                    where += ` AND(wb.display_type = 2)`;
                                    break
                                case "Image":
                                    where += ` AND(wb.display_type = 0)`;
                                    break
                                default:
                                    where += ` AND(wb.display_type = 0)`
                            }
                        }
                        else{
                            where += ` AND(company.company_name LIKE "%${postData?.search_str}%" OR wb.title LIKE "%${postData?.search_str}%" OR wb.link_title LIKE '%${postData?.search_str}%' OR wb.short_desc LIKE '%${postData?.search_str}%' OR wb.more_desc LIKE '%${postData?.search_str}%' OR category.title LIKE '%${postData?.search_str}%')`;
                        }
                    }
                }
            }
            const resultedData = await this.wellbeingPostService.paginateList(
                field,
                where,
                postData,
                req
            );
            if (req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN) {
                await Promise.all(resultedData['list'].map(async (element)=>{
                    if (element?.category?.parent_id == null || element?.category?.parent_id == undefined) {
                        element['category_heirarchy'] = element?.category?.title;
                    }
                    else{
                        let categoryParent = await this.getParent(element.category.id,[],req);
                        element['category_heirarchy'] = categoryParent?.concatenatedString ? categoryParent?.concatenatedString.slice().reverse().join(' -> ') : '';
                    }
                }));
            }
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(WellBeingPostDto, resultedData['list'], req.lang)
            );
            let defaultImage = S3_URL + `emotionalwellbeing/NotFound.png`;
            await Promise.all(resultedData['list'].map(async (element)=>{
                if(element.post_img){
                    if(element.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${element['cat_id']}_${element['id']}_${element['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${element['org_id']}/${element['cat_id']}`,`dynamic`);
                        element.title = (customName == '' || customName == `post_title_${element['cat_id']}_${element['id']}_${element['org_id']}`) ? element['title'] : customName;
                    }
                    if(element.link_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_linktitle_${element['cat_id']}_${element['id']}_${element['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${element['org_id']}/${element['cat_id']}`,`dynamic`);
                        element.link_title = (customName == '' || customName == `post_linktitle_${element['cat_id']}_${element['id']}_${element['org_id']}`) ? element['link_title'] : customName;
                    }
                    if(element.short_desc){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_shortdesc_${element['cat_id']}_${element['id']}_${element['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${element['org_id']}/${element['cat_id']}`,`dynamic`);
                        element.short_desc = (customName == '' || customName == `post_shortdesc_${element['cat_id']}_${element['id']}_${element['org_id']}`) ? element['short_desc'] : customName;
                    }
                    if(element.more_desc){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_moredesc_${element['cat_id']}_${element['id']}_${element['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${element['org_id']}/${element['cat_id']}`,`dynamic`);
                        element.more_desc = (customName == '' || customName == `post_moredesc_${element['cat_id']}_${element['id']}_${element['org_id']}`) ? element['more_desc'] : customName;
                    }
                    let check_file = await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: element.post_img.replace(S3_URL,'') }));
                    if(check_file){
                        element.post_img = element.post_img;
                    }
                    else{
                        element.post_img = defaultImage;
                    }
                }
            }));
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
            let recordDetails = await this.wellbeingPostService.findOne(where);
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
            recordDetails = <any>(
                await this.commonArrayService.formatToDto(WellBeingPostDto, recordDetails, req.lang)
            );
            if(recordDetails.title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${recordDetails['org_id']}/${recordDetails['cat_id']}`,`dynamic`);
                recordDetails.title = (customName == '' || customName == `post_title_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`) ? recordDetails['title'] : customName;
            }
            if(recordDetails.link_title){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_linktitle_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${recordDetails['org_id']}/${recordDetails['cat_id']}`,`dynamic`);
                recordDetails.link_title = (customName == '' || customName == `post_linktitle_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`) ? recordDetails['link_title'] : customName;
            }
            if(recordDetails.short_desc){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_shortdesc_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${recordDetails['org_id']}/${recordDetails['cat_id']}`,`dynamic`);
                recordDetails.short_desc = (customName == '' || customName == `post_shortdesc_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`) ? recordDetails['short_desc'] : customName;
            }
            if(recordDetails.more_desc){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_moredesc_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${recordDetails['org_id']}/${recordDetails['cat_id']}`,`dynamic`);
                recordDetails.more_desc = (customName == '' || customName == `post_moredesc_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`) ? recordDetails['more_desc'] : customName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: recordDetails,
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
                storage: diskStorage({
                    destination: `${appConstant.FITNESS_IMAGE_PATH}`,
                    filename: fileName,
                }),
                fileFilter: filesFilter,
            },
        ),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateWellBeingPostInput, @UploadedFiles() files: Record<string, Express.Multer.File>) {
        try {
            postData['display_type'] = postData?.display_type ?? 0;
            postData['atime'] = postData?.atime ?? 0;
            postData['atime_type'] = postData?.atime_type ?? 0;
            postData['short_desc'] = postData?.short_desc ?? ' ';
            postData['more_desc'] = postData?.more_desc ?? ' ';
            /* below validation remove as per old system wise*/
            if (
                !postData?.org_id ||
                !postData?.cat_id ||
                !postData?.title
            ) {
                if (files && files.post_img && files.post_img[0].fieldname === 'post_img' && files.post_img[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.post_img[0].path);
                }
                if (files && files.display_area && files.display_area[0].fieldname === 'display_area' && files.display_area[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.display_area[0].path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData['post_img'] = '';
            if(postData?.time && postData?.time == ''){
                delete postData?.time
            }
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
            let resultedData = await this.wellbeingPostService.save({...postData,
                created_by: req.tokenUser?.id,
                updated_by : req.tokenUser?.id
            });
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `post_title_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }
            if(postData?.link_title){
                let link_title = `post_linktitle_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`
                dynamicDatas[`${link_title}`]= postData?.link_title;
            }
            if(postData?.short_desc){
                let tilte = `post_shortdesc_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`
                dynamicDatas[`${tilte}`]= postData?.short_desc;
            }            
            if(postData?.more_desc){
                let tilte = `post_moredesc_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`
                dynamicDatas[`${tilte}`]= postData?.more_desc;
            }            
            await this.translatorService.DynamicEngJsonData('Emotionalwellbeing',resultedData['org_id'],dynamicDatas,'Edit','Emotionalwellbeing',resultedData['cat_id']);
            if (files && files.post_img &&  files?.post_img[0]?.fieldname === 'post_img' && files?.post_img[0]?.filename) {
                files.post_img[0].originalname = this.commonFileService.formatFileName(files?.post_img[0]?.originalname);
                let image_thumb = Object.create(files.post_img[0]);
                image_thumb.path = image_thumb.path.split('.')[0]+ '1.'+ image_thumb.path.split('.')[1];
                await this.commonService.resizeImage(files.post_img[0].path,image_thumb.path);
                let fileName = `emopost_` + this.commonService.generateMD5(resultedData['id'].toString()) + '.' + files?.post_img[0]?.originalname.split('.')[files?.post_img[0]?.originalname.split('.').length - 1]
                let image_poster = `emopost/${postData?.org_id}/${fileName}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.post_img[0].path),  filename: image_poster}));
                let filename = `emopost/${postData?.org_id}/thumb/${fileName}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(image_thumb.path),  filename: filename}));
                postData['post_img'] = fileName;
            }
            if (files && files.display_area && files?.display_area[0]?.fieldname === 'display_area' && files?.display_area[0]?.filename) {
                files.display_area[0].originalname = this.commonFileService.formatFileName(files?.display_area[0]?.originalname);
                let filename = `emopost/${postData?.org_id}/post/emopostattc_${this.commonService.generateMD5(resultedData['id'].toString())}.${files?.display_area[0]?.originalname.split('.')[files?.display_area[0]?.originalname.split('.').length - 1]}`; 
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.display_area[0].path),  filename: filename}));
                postData['display_area'] = filename;
            }
            if(postData?.post_img || postData?.display_area){
                await this.wellbeingPostService.update({id: resultedData['id']},{...postData,
                    created_by: req.tokenUser?.id,
                    updated_by : req.tokenUser?.id
                });
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Post has been added successfully"),
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
            const recordDetails = await this.wellbeingPostService.findOne(where);
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
            await this.wellbeingPostService.update(where, {status : 2, updated_by: req.tokenUser?.id});
            this.activityLogService.create(recordDetails, postData, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,  "Post has been deleted successfully"),
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
                storage: diskStorage({
                    destination: `${appConstant.FITNESS_IMAGE_PATH}`,
                    filename: fileName,
                }),
                fileFilter: filesFilter,
            },
        ),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateWellBeingPostInput, @UploadedFiles() files: Record<string, Express.Multer.File>) {
        try {
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
            const recordDetails = await this.wellbeingPostService.findOne(where);
            if(postData?.time && postData?.time == ''){
                delete postData?.time
            }
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
            if (!recordDetails) {
                await this.wellbeingPostService.save({
                    ...postData,
                    created_by: req.tokenUser?.id,
                    updated_by : req.tokenUser?.id
                });
            }
            if (files && files.post_img &&  files?.post_img[0]?.fieldname === 'post_img' && files?.post_img[0]?.filename) {
                files.post_img[0].originalname = this.commonFileService.formatFileName(files?.post_img[0]?.originalname);
                let image_thumb = Object.create(files.post_img[0]);
                image_thumb.path = image_thumb.path.split('.')[0]+ '1.'+ image_thumb.path.split('.')[1];
                await this.commonService.resizeImage(files.post_img[0].path,image_thumb.path);
                let fileName = `emopost_` + this.commonService.generateMD5(recordDetails['id'].toString()) + '.' + files?.post_img[0]?.originalname.split('.')[files?.post_img[0]?.originalname.split('.').length - 1]
                let image_poster = `emopost/${postData?.org_id}/${fileName}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.post_img[0].path),  filename: image_poster}));
                let filename = `emopost/${postData?.org_id}/thumb/${fileName}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(image_thumb.path),  filename: filename}));
                postData['post_img'] = fileName;
            }
            if (files && files.display_area && files?.display_area[0]?.fieldname === 'display_area' && files?.display_area[0]?.filename) {
                files.display_area[0].originalname = this.commonFileService.formatFileName(files?.display_area[0]?.originalname);
                let filename = `empost/${postData?.org_id}/display_area/` + this.commonService.generateMD5(recordDetails['id'].toString()) + '_' + files.display_area[0].originalname;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.display_area[0].path),  filename: filename}));
                postData['display_area'] = filename;
            }
            await this.wellbeingPostService.update(where, {...postData, updated_by : req.tokenUser?.id });
            let dynamicDatas = Object.create(null);
            if(postData?.title){
                let tilte = `post_title_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`
                dynamicDatas[`${tilte}`]= postData?.title;
            }
            if(postData?.link_title){
                let link_title = `post_linktitle_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`
                dynamicDatas[`${link_title}`]= postData?.link_title;
            }
            if(postData?.short_desc){
                let tilte = `post_shortdesc_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`
                dynamicDatas[`${tilte}`]= postData?.short_desc;
            }            
            if(postData?.more_desc){
                let tilte = `post_moredesc_${recordDetails['cat_id']}_${recordDetails['id']}_${recordDetails['org_id']}`
                dynamicDatas[`${tilte}`]= postData?.more_desc;
            }            
            await this.translatorService.DynamicEngJsonData('Emotionalwellbeing',recordDetails['org_id'],dynamicDatas,'Edit','Emotionalwellbeing',recordDetails['cat_id']);
            this.activityLogService.create(recordDetails, postData, tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST, req.tokenUser?.id);
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
            if ((req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id) && (!postData?.org_id || !postData?.cat_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = {};
            if (postData?.org_id && postData?.cat_id) {
                where = {org_id: In([postData?.org_id, 0]), cat_id: postData?.cat_id, status: 1};
            }
            let resultedData = await this.wellbeingPostService.listRecord(where,["DISTINCT maincollection AS maincollection","cat_id","org_id"],{maincollection: 'ASC'});
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        if (ele.maincollection) {
                            let maincollectionClean = ele['maincollection'].replace(/[^a-zA-Z0-9]/g, '');
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `${maincollectionClean}_${ele['org_id']}_${ele['cat_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`, `dynamic`);
                            ele.maincollectionT = (customName == '' || customName == `${maincollectionClean}_${ele['org_id']}_${ele['cat_id']}`) ? ele['maincollection'] : customName;
                        }
                    }));
                }
            }
            let minMaxData = await this.wellbeingPostService.findOne(where,["MIN(atime) AS durationMin", "MAX(atime) AS durationMax"]);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                duration: minMaxData,
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
    @Post('post-list')
    async postist(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `ep.status = 1 `;
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id) {
                where +=` AND coach.coach_manager_id = '${req.tokenUser?.id}' `;
            } else {
                where += ` AND coach.coach_manager_id  != '0' `;
                if (!postData?.search_str) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (postData?.search_str) {
                where += ` AND ep.title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' `;
            }
            let resultedData = [];
            if (postData?.org_id && postData?.cat_id) {
                where = `ep.status = 1 AND ep.org_id IN (${postData?.org_id}) AND ep.cat_id = ${postData?.cat_id} `;
                if (postData?.search_str) {
                    where += ` AND ep.title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' `;
                }
                resultedData = await this.wellbeingPostService.listRecord(where,["ep.id AS id", "ep.title AS title", "ep.cat_id AS cat_id", "ep.org_id AS org_id"],{id: "ASC"});
            }else {
                resultedData = await this.wellbeingPostService.listRecord(where, ["ep.id AS id", "ep.title AS title", "ep.cat_id AS cat_id", "ep.org_id AS org_id", "company.company_name AS company_name"], {id: "ASC"}, [tableConstant.COACH.TBL_CO_COACHES, tableConstant.COMPANIES.TBL_COMPANY]);
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(WellBeingPostDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.title = (customName == '' || customName == `post_title_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`) ? ele['title'] : customName;
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
    @Post('campaign-post-list')
    async campaignPostList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if ((req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id)  && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `ep.status = 1 AND org_id IN (0,${postData?.org_id}) `;
            if (postData?.search_str) {
                where += ` AND ep.title LIKE '%${this.commonFileService.quoteEscaper(postData?.search_str)}%' `;
            }
            let resultedData = await this.wellbeingPostService.campaginListRecord(where,["id AS id","title AS title"],{id: "ASC"});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(WellBeingPostDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_title_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.title = (customName == '' || customName == `post_title_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`) ? ele['title'] : customName;
                    }
                    if(ele.link_title){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_linktitle_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.link_title = (customName == '' || customName == `post_linktitle_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`) ? ele['link_title'] : customName;
                    }
                    if(ele.short_desc){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_shortdesc_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.short_desc = (customName == '' || customName == `post_shortdesc_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`) ? ele['short_desc'] : customName;
                    }
                    if(ele.more_desc){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`post_moredesc_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`, `/LC_MESSAGES/Emotionalwellbeing/Emotionalwellbeing/${ele['org_id']}/${ele['cat_id']}`,`dynamic`);
                        ele.more_desc = (customName == '' || customName == `post_moredesc_${resultedData['cat_id']}_${resultedData['id']}_${resultedData['org_id']}`) ? ele['more_desc'] : customName;
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
    async getParent(id, concatenatedString =[],req) {
        try {
            const record =  await this.wellbeingCategoryService.findOne({ id: id });
            if (record) {
                if(record.title){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`category_title_${record['id']}`, `/LC_MESSAGES/Media/Media/${record['org_id']}/${record['id']}`,`dynamic`);
                    record.title = (customName == '' || customName == `category_title_${record['id']}`) ? record['title'] : customName;
                }
                if (record.parent_id) {
                    concatenatedString.push(record.title)
                    return await this.getParent(record.parent_id, concatenatedString,req)
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
}