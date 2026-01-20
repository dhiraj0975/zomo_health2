import { appConstant, CommonArrayService, CommonFileService, CommonService, MediaFitnessVideosDto, tableConstant } from '@common-constants';
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
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
    FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import { lastValueFrom } from 'rxjs';
import { SettingsService } from 'src/modules/company/settings/settings.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { In, Like, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { fileName, imgFilter } from '../../../utils/image-upload.utils';
import { TranslationService } from '../../translation/translation.service';
import { FitnessCategoryService } from "../category/fitnesscategory.service";
import { FitnessEquipmentService } from "../equipment/fitnessequipment.service";
import { FitnessFocusService } from "../focus/fitnessfocus.service";
import { FrontService } from "../front/front.service";
import { PaginationWithMediaFitnessInput } from '../input';
import { FitnessInstructorService } from "../instructor/fitnessinstructor.service";
import { FitnessSeriesService } from "../series/fitnessseries.service";
import { FitnessVideoCategoryService } from "../videocategory/fitnessvideocategory.service";
import { FitnessVideoEquipmentService } from "../videoequipment/fitnessvideoequipment.service";
import { FitnessVideoFocusService } from "../videofocus/fitnessvideofocus.service";
import { FitnessVideoInstructorsService } from "../videoinstructors/fitnessvideoinstructors.service";
import { FitnessVideoSeriesService } from "../videoseries/fitnessvideoseries.service";
import { FitnessVideoStatusService } from '../videostatus/fitnessvideostatus.service';
import { FitnessVideosService } from './fitnessvideos.service';
import { CreateMediaFitnessVideosInput } from './input';
const path = require('path');
const S3_URL =  process.env.S3_URL_PROD
@Controller('media-fitness/videos')
@UseGuards(TokenGuard, RoleGuard)
export class FitnessVideosController {
    constructor(
        private readonly fitnessVideosService: FitnessVideosService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly fitnessVideoStatusService: FitnessVideoStatusService,
        private readonly activityLogService: ActivityLogService,
        private readonly companySettingsService: SettingsService,
        private readonly fitnessVideoCategoryService: FitnessVideoCategoryService,
        private readonly fitnessCategoryService: FitnessCategoryService,
        private readonly fitnessVideoFocusService: FitnessVideoFocusService,
        private readonly fitnessVideoEquipmentService: FitnessVideoEquipmentService,
        private readonly fitnessVideoSeriesService: FitnessVideoSeriesService,
        private readonly fitnessVideoInstructorsService: FitnessVideoInstructorsService,
        private readonly fitnessFocusService: FitnessFocusService,
        private readonly fitnessEquipmentService: FitnessEquipmentService,
        private readonly fitnessSeriesService: FitnessSeriesService,
        private readonly fitnessInstructorService: FitnessInstructorService,
        private readonly frontService: FrontService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: PaginationWithMediaFitnessInput,
    ) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (typeof postData.saved_videos === 'string') {
                postData.saved_videos = postData.saved_videos === 'true';
            }
            postData['role'] = (appConstant.ROLE.ADMIN == req.tokenUser?.role_id  || appConstant.ROLE.ORGADMIN == req.tokenUser?.role_id || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id);
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            const companySetting = await this.companySettingsService.findOne({org_id: postData?.org_id});
            let where = postData['role'] ? 'fitness.status !=2' : 'fitness.status = 1';
            if (postData?.v_id) {
                where += ` AND fitness.v_id = '${postData?.v_id}'`;
            }
            if (postData?.exclude_v_id) {
                where += ` AND fitness.id != ${postData?.exclude_v_id}`;
            }
            if (postData?.org_id && (postData?.video_setting || companySetting?.video_setting)) {
                where += ` AND fitness.org_id IN(${postData?.org_id}) `;
            }
            else{
                where += ` AND fitness.org_id IN(0,${postData?.org_id}) `;
            }
            let field = ['fitness.id','fitness.org_id','fitness.name','fitness.description','fitness.provider_name','fitness.status','fitness.created'];
            if (!postData['role']) {
                field = field.concat(['fitness.v_id','fitness.v_link','fitness.duration','fitness.calories','fitness.image_poster','fitness.image_thumb','fitness.rating_avg','fitness.rating_count','fitness.rating_avg_category','fitness.rating_count_category','fitness.rating_avg_series','fitness.rating_count_series', 'settings.fitnessvideofavoriteslist']);
                where += ` AND (fvStatus.status IS NULL OR fvStatus.status = '1')`;
                let fileName = `media/json/${postData?.org_id.toString()}/${postData?.user_id.toString()}/${this.commonService.generateMD5(req.tokenUser?.code.toString())}${this.commonService.generateMD5(postData?.user_id.toString())}.json`;
                let dataFileRead = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: fileName}));
                if (dataFileRead) {
                    const { AcceptRanges, LastModified, ContentLength, ETag, ContentType, ServerSideEncryption, Metadata, Body, ...getData } = dataFileRead;
                    dataFileRead = getData;
                }
                else{
                    dataFileRead = {}; 
                }
                const validKeys = new Set(['search_str', 'sort_by', 'categories', 'focus', 'equipment', 'series']);
                const isValid = Array.from(validKeys).some(key => 
                    Object.prototype.hasOwnProperty.call(postData, key) && postData[key] !== ''
                );
                postData.is_valid = isValid;
                if (isValid) {
                    const { page, limit, order_by, order, org_id, cat_id, user_id, ...searchData } = postData;
                    let dataSave = this.commonFileService.saveUserDetail(searchData,['search_str', 'categories', 'focus', 'equipment', 'series', 'sort_by', 'time'],postData?.org_id,appConstant.EMOTIONAL_WELL_BEING_JSON_PATH,req.tokenUser?.code,dataFileRead,['sort_by'])
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(dataSave.filePath),  filename: fileName}));
                    if (postData?.categories) {
                        where += ` AND fvc.c_id IN(${postData?.categories})`
                    }
                    if (postData?.focus) {
                        where += ` AND fvf.f_id IN(${postData?.focus})`
                    }
                    if (postData?.equipment) {
                        where += ` AND fve.e_id IN(${postData?.equipment})`
                    }
                    if (postData?.series) {
                        where += ` AND fvs.s_id IN(${postData?.series})`
                    }
                    if (postData?.search_str) {
                        where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['fitness.name'],false);
                    }
                } else if (dataFileRead){
                    let dataFileReadList = Object.keys(dataFileRead).reverse().reduce((obj, key) => {
                        obj[key] = dataFileRead[key];
                        return obj;
                    }, {});
                    const properties = ['search_str', 'categories', 'focus', 'equipment', 'series', 'sort_by'];
                    for (const date of Object.keys(dataFileReadList)) {
                        let data;
                        if (Object.prototype.hasOwnProperty.call(dataFileReadList, date)) {
                            data = dataFileReadList[date];
                        }
                        if (Object.keys(postData).length === 0) {
                          postData = data;
                        } else {
                          for (const property of properties) {
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
            } else {
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str, ['fitness.name','fitness.v_link','fitness.description','fitness.provider_name']);
                }
            }
            const resultedData = await this.fitnessVideosService.paginateList(
                field,
                where,
                postData,
            );
            resultedData['list'] = <any>(await this.commonArrayService.formatToDto(MediaFitnessVideosDto,resultedData['list'], req.lang));
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_video_name_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/Video/${ele['id']}`,`dynamic`);
                        ele.name = (customName == '' || customName == `fitness_video_name_${ele['id']}`) ? ele['name'] : customName;
                    }
                    if(ele.description){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_video_description_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/Video/${ele['id']}`,`dynamic`);
                        ele.description = (customName == '' || customName == `fitness_video_description_${ele['id']}`) ? ele['description'] : customName;
                    }
                    if(ele.provider_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_video_providername_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/Video/${ele['id']}`,`dynamic`);
                        ele.provider_name = (customName == '' || customName == `fitness_video_providername_${ele['id']}`) ? ele['provider_name'] : customName;
                    }
                    if(ele.image_thumb){
                        let imageExist = await this.commonService.checkImage(ele.image_thumb);
                        if(!imageExist){
                            ele.image_thumb = S3_URL + `emotionalwellbeing/NotFound.png`;
                        }
                    }
                }));
            }
            if(appConstant.ROLE.ORGADMIN == req.tokenUser?.role_id){
                let ids = resultedData['list'].filter(item => item.org_id === 0).map(item => item.id);
                let statusData = await this.fitnessVideoStatusService.listRecord({v_id: In(ids), org_id: req.tokenUser?.org_id});
                if(statusData){
                    statusData.forEach(item2 => {
                        let foundIndex = resultedData['list'].findIndex(item1 => item2.v_id === item1.id && item2.org_id === req.tokenUser?.org_id);
                        if (foundIndex !== -1) {
                            resultedData['list'][foundIndex].status = item2.status;
                        }
                    });
                }
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
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING',),);
            }
            const where = { id: postData?.id };
            if(postData?.org_id){
                where['org_id'] = In([0,postData?.org_id]);
            }
            let resultedData: any = await this.frontService.fitnessVideosData(['fitnessVideo.id AS id','fitnessVideo.org_id AS org_id','fitnessVideo.v_id AS v_id','fitnessVideo.v_link AS v_link','fitnessVideo.name AS name','fitnessVideo.duration AS duration','fitnessVideo.calories AS calories','fitnessVideo.description AS description','fitnessVideo.image_poster AS image_poster','fitnessVideo.image_thumb AS image_thumb','fitnessVideo.rating_avg AS rating_avg','fitnessVideo.rating_count AS rating_count','fitnessVideo.rating_avg_category AS rating_avg_category','fitnessVideo.rating_count_category AS rating_count_category','fitnessVideo.rating_avg_series AS rating_avg_series','fitnessVideo.rating_count_series AS rating_count_series','fitnessVideo.provider_name AS provider_name','fitnessVideo.duration_id AS duration_id','GROUP_CONCAT(DISTINCT fvc.c_id) AS fvc','GROUP_CONCAT(DISTINCT fvf.f_id) AS fvf','GROUP_CONCAT(DISTINCT fve.e_id) AS fve','GROUP_CONCAT(DISTINCT fvs.s_id) AS fvs','GROUP_CONCAT(DISTINCT fvi.i_id) AS fvi'], where, null, [{'join_table': 'fitnessVideo.fvc','alias':'fvc', 'table' : tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_CATEGORIES, 'on_condition' : `fitnessVideo.id = fvc.v_id AND fvc.status = '1'`, 'join_type': 'left_many' },{'join_table': 'fitnessVideo.fvf','alias':'fvf', 'table' : tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_FOCUS, 'on_condition' : `fitnessVideo.id = fvf.v_id AND fvf.status = '1'`, 'join_type': 'left_many' },{'join_table': 'fitnessVideo.fve','alias':'fve', 'table' : tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_EQUIPMENT, 'on_condition' : `fitnessVideo.id = fve.v_id AND fve.status = '1'`, 'join_type': 'left_many' },{'join_table': 'fitnessVideo.fvs','alias':'fvs', 'table' : tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_SERIES, 'on_condition' : `fitnessVideo.id = fvs.v_id AND fvs.status = '1'`, 'join_type': 'left_many' },{'join_table': 'fitnessVideo.fvi','alias':'fvi', 'table' : tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_INSTRUCTORS, 'on_condition' : `fitnessVideo.id = fvi.v_id AND fvi.status = '1'`, 'join_type': 'left_many' }], 'getRawOne');
            let durationData: any = await this.frontService.fitnessVideosData(['fitnessVideo.id AS id','fd','duration_range'], where, null, [{'join_table': 'fitnessVideo.fd','alias':'fd', 'table' : tableConstant.MEDIA_FITNESS.TBL_ME_FOD_DIFFICULTY, 'on_condition' : `fitnessVideo.difficulty_id = fd.id AND fd.status = '1'`, 'join_type': 'left_one' },{'join_table': 'fitnessVideo.duration_range','alias':'duration_range', 'table' : tableConstant.MEDIA_FITNESS.TBL_ME_FOD_DURATION_RANGE, 'on_condition' : `fitnessVideo.duration_id = duration_range.id AND duration_range.status = '1'`, 'join_type': 'left_one' }], 'getRawOne');
            if (!resultedData || resultedData.length == 0) {
                let message = await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND',)
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: message,
                });
            }
            if (resultedData?.fvc) {
                resultedData.fvc = resultedData?.fvc.split(',').map(Number)
                resultedData.fvc = await this.fitnessCategoryService.listRecord({status: '1',org_id: In([0,postData?.org_id]),id: In(resultedData.fvc)},['id','name','org_id']);
                for (let item of resultedData.fvc) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_category_${item.id}`, `/LC_MESSAGES/Media/Fitnessvideos/${item['org_id']}/category`,`dynamic`);
                    item.name = (customName == '' || customName == `fitness_category_${item['id']}`) ? resultedData['name'] : customName;
                }
            }
            if (resultedData?.fvf) {
                resultedData.fvf = resultedData?.fvf.split(',').map(Number)
                resultedData.fvf = await this.fitnessFocusService.listRecord({status: '1',org_id: In([0,postData?.org_id]),id: In(resultedData.fvf)},['id','name','org_id']);
                for (let item of resultedData.fvf) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_focus_${item.id}`, `/LC_MESSAGES/Media/Fitnessvideos/${item['org_id']}/focus`,`dynamic`);
                    item.name = (customName == '' || customName == `fitness_focus_${item['id']}`) ? resultedData['name'] : customName;
                }
            }
            if (resultedData?.fve) {
                resultedData.fve = resultedData?.fve.split(',').map(Number)
                resultedData.fve = await this.fitnessEquipmentService.listRecord({status: '1',org_id: In([0,postData?.org_id]), id: In(resultedData.fve)},['id','name','org_id']);
                for (let item of resultedData.fve) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_equipment_${item.id}`, `/LC_MESSAGES/Media/Fitnessvideos/${item['org_id']}/equipment`,`dynamic`);
                    item.name = (customName == '' || customName == `fitness_equipment_${item['id']}`) ? resultedData['name'] : customName;
                }
            }
            if (resultedData?.fvs) {
                resultedData.fvs = resultedData?.fvs.split(',').map(Number)
                resultedData.fvs = await this.fitnessSeriesService.listRecord({status: '1',org_id: In([0,postData?.org_id]),id: In(resultedData.fvs)},['id','name','org_id']);
                for (let item of resultedData.fvs) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_series_${item.id}`, `/LC_MESSAGES/Media/Fitnessvideos/${item['org_id']}/series`,`dynamic`);
                    item.name = (customName == '' || customName == `fitness_series_${item['id']}`) ? resultedData['name'] : customName;
                }
            }
            if (resultedData?.fvi) {
                resultedData.fvi = resultedData?.fvi.split(',').map(Number)
                resultedData.fvi = await this.fitnessInstructorService.listRecord({status: '1',org_id: In([0,postData?.org_id]),id: In(resultedData.fvi)},['id','first_name','last_name','full_name','org_id']);
                for (let item of resultedData.fvi) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_instruction_firstname_${item.id}`, `/LC_MESSAGES/Media/Fitnessvideos/${item['org_id']}/instruction`,`dynamic`);
                    item.first_name = (customName == '' || customName == `fitness_instruction_firstname_${item['id']}`) ? resultedData['first_name'] : customName;
                    customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_instruction_lastname_${item.id}`, `/LC_MESSAGES/Media/Fitnessvideos/${item['org_id']}/instruction`,`dynamic`);
                    item.last_name = (customName == '' || customName == `fitness_instruction_lastname_${item['id']}`) ? resultedData['last_name'] : customName;
                }
            }
            if (durationData?.fd_id) {
                resultedData.fd = {
                    id: durationData.fd_id,
                    org_id: durationData.fd_org_id,
                    d_id: durationData.fd_d_id,
                    code: durationData.fd_code,
                    name: durationData.fd_name,
                    status: durationData.fd_status,
                    created: durationData.fd_created,
                    updated: durationData.fd_updated
                }
            }
            if (durationData?.duration_range_id) {
                resultedData.duration_range = {
                    id: durationData.duration_range_id,
                    org_id: durationData.duration_range_org_id,
                    d_id: durationData.duration_range_d_id,
                    code: durationData.duration_range_code,
                    name: durationData.duration_range_name,
                    status: durationData.duration_range_status,
                    created: durationData.duration_range_created,
                    updated: durationData.duration_range_updated
                }
            }
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessVideosDto, resultedData, req.lang)
            );
            if(resultedData?.dificulty?.name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_difficulty_${resultedData.dificulty.id}`, `/LC_MESSAGES/Media/Fitnessvideos/${resultedData.dificulty.org_id}/difficulty`,`dynamic`);
                resultedData.fd = (customName == '' || customName == `fitness_difficulty_${resultedData.dificulty.id}`) ? resultedData.dificulty['name'] : customName;
            }
            if(resultedData?.name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_video_name_${resultedData['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${resultedData['org_id']}/Video/${resultedData['id']}`,`dynamic`);
                resultedData.name = (customName == '' || customName == `fitness_video_name_${resultedData['id']}`) ? resultedData['name'] : customName;
            }
            if(resultedData?.description){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_video_description_${resultedData['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${resultedData['org_id']}/Video/${resultedData['id']}`,`dynamic`);
                resultedData.description = (customName == '' || customName == `fitness_video_description_${resultedData['id']}`) ? resultedData['description'] : customName;
            }
            if(resultedData?.provider_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_video_providername_${resultedData['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${resultedData['org_id']}/Video/${resultedData['id']}`,`dynamic`);
                resultedData.provider_name = (customName == '' || customName == `fitness_video_providername_${resultedData['id']}`) ? resultedData['provider_name'] : customName;
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
                { name: 'image_thumb', maxCount: 1 },
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
    async create(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateMediaFitnessVideosInput,
        @UploadedFiles() files: Record<string, Express.Multer.File>,
    ) {
        try {
            postData.description = postData?.description || '';
            if (
                !postData?.org_id ||
                (postData?.description == undefined || postData?.description == null) ||
                !files.image_thumb
            ) {
                if (files && files.image_thumb && files.image_thumb[0].fieldname === 'image_thumb' && files.image_thumb[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.image_thumb[0].path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING',),
                );
            }
            postData['image_thumb'] = '';
            postData['image_poster'] = postData?.image_poster  || '';
            if(postData?.name){
                let where = {name: postData?.name, org_id: postData?.org_id, status: Not(2)};
                const categoryCheck = await this.fitnessVideosService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
                }
            }
            let resultedData = await this.fitnessVideosService.save({
                ...postData,
                created_by: req.tokenUser?.id,
            });
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `fitness_video_name_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }           
            if(postData?.description && postData?.description != ' '){
                let tilte = `fitness_video_description_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.description;
            }           
            if(postData?.provider_name && postData?.provider_name != ' '){
                let tilte = `fitness_video_providername_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.provider_name;
            }           
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Fitnessvideos','Video',resultedData['id']);
            const splitAndDelete = (property: string, obj: any): string[] => {
                const ids = (obj?.[property]?.split(',') || []).filter(Boolean);
                delete obj?.[property];
                return ids;
            };
            let categoryIds: string[] = splitAndDelete('category_ids', postData);
            let focusIds: string[] = splitAndDelete('focus_ids', postData);
            let equipmentIds: string[] = splitAndDelete('equipment_ids', postData);
            let seriesIds: string[] = splitAndDelete('series_ids', postData);
            let instructorsIds: string[] = splitAndDelete('instructors_ids', postData);
            if (categoryIds.length == 0) {
                let categoryData = await this.fitnessCategoryService.listRecord({status: '1',org_id: In([0,postData?.org_id])},['id'],{ id: 'ASC' });
                categoryIds = categoryData.map(item => item.id.toString());
                categoryIds = categoryIds.slice(0, 5);
                /* short time add*/
            }
            let categoryVideoData: any = await this.fitnessVideoCategoryService.listRecord({status: '1',v_id: resultedData['id']});
            let saveCategoryData = [],updateCategoryData = [];
            for (let i = 0; i < categoryVideoData.length; i++) {
                const {c_id} = categoryVideoData[i];
                if (!categoryIds.includes(String(c_id))) {
                    saveCategoryData.push({v_id: resultedData['id'],c_id: c_id})
                }
            }
            if (updateCategoryData.length > 0) {
                await this.fitnessVideoCategoryService.update(updateCategoryData,{status: '2'})
            }
            let categoryVideoIds = categoryVideoData.map(item => item.c_id.toString());
            const addCategoryVideoData = categoryIds.filter(item => !categoryVideoIds.includes(item));
            for (let i = 0; i < addCategoryVideoData.length; i++) {
                saveCategoryData.push({v_id: resultedData['id'],c_id: addCategoryVideoData[i]})
            }
            if (saveCategoryData.length > 0) {
                await this.fitnessVideoCategoryService.save(saveCategoryData)
            }
            if (focusIds.length == 0) {
                let focusData = await this.fitnessFocusService.listRecord({status: '1',org_id: In([0,postData?.org_id])},['id'],{ id: 'ASC' });
                focusIds = focusData.map(item => item.id.toString());
                focusIds = focusIds.slice(0, 5);
            }
            let focusVideoData: any = await this.fitnessVideoFocusService.listRecord({status: '1',v_id: resultedData['id']});
            let saveFocusData = [],updateFocusData= [];
            for (let i = 0; i < focusVideoData.length; i++) {
                const {f_id} = focusVideoData[i];
                if (!focusIds.includes(String(f_id))) {
                    updateFocusData.push({v_id: resultedData['id'],f_id: f_id})
                }
            }
            if (updateFocusData.length > 0) {
                await this.fitnessVideoFocusService.update(updateFocusData,{status: '2'})
            }
            let focusVideoIds = focusVideoData.map(item => item.f_id.toString());
            const addFocusVideoData = focusIds.filter(item => !focusVideoIds.includes(item));
            for (let i = 0; i < addFocusVideoData.length; i++) {
                saveFocusData.push({v_id: resultedData['id'],f_id: addFocusVideoData[i]})
            }
            if (saveFocusData.length > 0) {
                await this.fitnessVideoFocusService.save(saveFocusData)
            }
            if (equipmentIds.length == 0) {
                let equipmentData = await this.fitnessEquipmentService.listRecord({status: '1',org_id: In([0,postData?.org_id])},['id'],{ id: 'ASC' });
                equipmentIds = equipmentData.map(item => item.id.toString());
                equipmentIds = equipmentIds.slice(0, 5);
            }
            let equipmentVideoData: any = await this.fitnessVideoEquipmentService.listRecord({status: '1',v_id: resultedData['id']});
            let saveEquipmentData = [],updateEquipmentData = [];
            for (let i = 0; i < equipmentVideoData.length; i++) {
                const {e_id} = equipmentVideoData[i];
                if (!equipmentIds.includes(String(e_id))) {
                    updateEquipmentData.push({v_id: resultedData['id'],e_id: e_id})
                }
            }
            if (updateEquipmentData.length > 0) {
                await this.fitnessVideoEquipmentService.update(updateEquipmentData,{status: '2'})
            }
            let equipmentVideoIds = equipmentVideoData.map(item => item.e_id.toString());
            const addEquipmentVideoData = equipmentIds.filter(item => !equipmentVideoIds.includes(item));
            for (let i = 0; i < addEquipmentVideoData.length; i++) {
                saveEquipmentData.push({v_id: resultedData['id'],e_id: addEquipmentVideoData[i]})
            }
            if (saveEquipmentData.length > 0) {
                await this.fitnessVideoEquipmentService.save(saveEquipmentData)
            }
            if (seriesIds.length == 0) {
                let seriesData = await this.fitnessSeriesService.listRecord({status: '1',org_id: In([0,postData?.org_id])},['id'],{ id: 'ASC' });
                seriesIds = seriesData.map(item => item.id.toString());
                seriesIds = seriesIds.slice(0, 5);
            }
            let seriesVideoData: any = await this.fitnessVideoSeriesService.listRecord({status: '1',v_id: resultedData['id']});
            let saveSeriesData = [],updateSeriesData = [];
            for (let i = 0; i < seriesVideoData.length; i++) {
                const {s_id} = seriesVideoData[i];
                if (!seriesIds.includes(String(s_id))) {
                    updateSeriesData.push({v_id: resultedData['id'],s_id: s_id})
                }
            }
            if (updateSeriesData.length > 0) {
                await this.fitnessVideoSeriesService.update(updateSeriesData,{status: '2'})
            }
            let seriesVideoIds = seriesVideoData.map(item => item.s_id.toString());
            const addSeriesVideoData = seriesIds.filter(item => !seriesVideoIds.includes(item));
            for (let i = 0; i < addSeriesVideoData.length; i++) {
                saveSeriesData.push({v_id: resultedData['id'],s_id: addSeriesVideoData[i]})
            }
            if (saveSeriesData.length > 0) {
                await this.fitnessVideoSeriesService.save(saveSeriesData)
            }
            if (instructorsIds.length == 0) {
                let instructorsData = await this.fitnessInstructorService.listRecord({status: '1',org_id: In([0,postData?.org_id])},['id'],{ id: 'ASC' });
                instructorsIds = instructorsData.map(item => item.id.toString());
                instructorsIds = instructorsIds.slice(0, 5);
            }
            let instructorsVideoData: any = await this.fitnessVideoInstructorsService.listRecord({status: '1',v_id: resultedData['id']});
            let saveInstructorsData = [],updateInstructorsData = [];
            for (let i = 0; i < instructorsVideoData.length; i++) {
                const {i_id} = instructorsVideoData[i];
                if (!instructorsIds.includes(String(i_id))) {
                    updateInstructorsData.push({v_id: resultedData['id'],i_id: i_id})
                }
            }
            if (updateInstructorsData.length > 0) {
                await this.fitnessVideoInstructorsService.update(updateInstructorsData,{status: '2'})
            }
            let instructorsVideoIds = instructorsVideoData.map(item => item.i_id.toString());
            const addInstructorsVideoData = instructorsIds.filter(item => !instructorsVideoIds.includes(item));
            for (let i = 0; i < addInstructorsVideoData.length; i++) {
                saveInstructorsData.push({v_id: resultedData['id'],i_id: addInstructorsVideoData[i]})
            }
            if (saveInstructorsData.length > 0) {
                await this.fitnessVideoInstructorsService.save(saveInstructorsData)
            }
            if (files && files.image_thumb && files.image_thumb[0].fieldname === 'image_thumb' && files.image_thumb[0].filename) {
                files.image_thumb[0].originalname = this.commonFileService.formatFileName(files.image_thumb[0].originalname);
                await this.commonFileService.copyFile(path.resolve(files.image_thumb[0].path),path.resolve(`${files.image_thumb[0].path.split('.')[0]}_copy.${files.image_thumb[0].path.split('.')[1]}`));
                let image_thumb = structuredClone(files.image_thumb[0]);
                image_thumb.path1 = path.resolve(`${files.image_thumb[0].path.split('.')[0]}_copy.${files.image_thumb[0].path.split('.')[1]}`);
                await this.commonService.resizeImage(files.image_thumb[0].path,image_thumb.path);
                let fileName = `mevideo_` + this.commonService.generateMD5(resultedData['id'].toString()) + '.' + files.image_thumb[0].originalname.split('.')[1]
                let image_poster = `media/video/${postData?.org_id}/mevideo_` + this.commonService.generateMD5(resultedData['id'].toString()) + '.' + files.image_thumb[0].originalname.split('.')[1];
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.image_thumb[0].path),  filename: image_poster}));
                let filename = `media/video/${postData?.org_id}/thumb/mevideo_` + this.commonService.generateMD5(resultedData['id'].toString()) + '.' + image_thumb.originalname.split('.')[1];
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(image_thumb.path1),  filename: filename}));
                postData['image_poster'] = fileName;
                postData['image_thumb'] = fileName;
                await this.fitnessVideosService.update({id: resultedData['id']},{...postData});
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Video has been added successfully"),
            });
        } catch (error) {
            if (files && files.image_thumb && files.image_thumb[0].fieldname === 'image_thumb' && files.image_thumb[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.image_thumb[0].path);
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = { id: postData?.id };
            const recordDetails =
                await this.fitnessVideosService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            await this.fitnessVideosService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEOS, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Video has been deleted successfully"),
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
                { name: 'image_thumb', maxCount: 1 },
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
    async update(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateMediaFitnessVideosInput,
        @UploadedFiles() files: Record<string, Express.Multer.File>,
    ) {
        try {
            if (!postData?.id) {
                if (files && files.image_thumb && files.image_thumb[0].fieldname === 'image_thumb' && files.image_thumb[0].filename) {
                    await this.commonFileService.removeFileFromLocal(files.image_thumb[0].path);
                }
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = { id: postData?.id };
            let org_id = postData?.org_id;
            let orgId = postData?.org_id ?? req.tokenUser?.org_id;
            delete postData?.org_id;
            const recordDetails = await this.fitnessVideosService.findOne(where);
            if(postData?.name){
                let where = {name: postData?.name, org_id: postData?.org_id || recordDetails.org_id, status: Not(2)};
                const categoryCheck = await this.fitnessVideosService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
                }
            }
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (!postData?.hasOwnProperty('status')) {
            const splitAndDelete = (property: string, obj: any): string[] => {
                const ids = (obj?.[property]?.split(',') || []).filter(Boolean);
                delete obj?.[property];
                return ids;
            };
            let categoryIds: string[] = splitAndDelete('category_ids', postData);
            let focusIds: string[] = splitAndDelete('focus_ids', postData);
            let equipmentIds: string[] = splitAndDelete('equipment_ids', postData);
            let seriesIds: string[] = splitAndDelete('series_ids', postData);
            let instructorsIds: string[] = splitAndDelete('instructors_ids', postData);
            if (categoryIds.length == 0) {
                let categoryData = await this.fitnessCategoryService.listRecord({status: '1',org_id: In([0,orgId])},['id'],{ id: 'ASC' });
                categoryIds = categoryData.map(item => item.id.toString());
                categoryIds = categoryIds.slice(0, 5);
            }
            let categoryVideoData: any = await this.fitnessVideoCategoryService.listRecord({status: '1',v_id: postData?.id});
            let saveCategoryData = [],updateCategoryData= [];
            for (let i = 0; i < categoryVideoData.length; i++) {
                const {c_id} = categoryVideoData[i];
                if (!categoryIds.includes(String(c_id))) {
                    updateCategoryData.push({v_id: postData?.id,c_id: c_id})
                }
            }
            if (updateCategoryData.length > 0) {
                await this.fitnessVideoCategoryService.update(updateCategoryData,{status: '2'})
            }
            let categoryVideoIds = categoryVideoData.map(item => item.c_id.toString());
            const addCategoryVideoData = categoryIds.filter(item => !categoryVideoIds.includes(item));
            for (let i = 0; i < addCategoryVideoData.length; i++) {
                saveCategoryData.push({v_id: postData?.id,c_id: addCategoryVideoData[i]})
            }
            if (saveCategoryData.length > 0) {
                await this.fitnessVideoCategoryService.save(saveCategoryData)
            }
            if (focusIds.length == 0) {
                let focusData = await this.fitnessFocusService.listRecord({status: '1',org_id: In([0,orgId])},['id'],{ id: 'ASC' });
                focusIds = focusData.map(item => item.id.toString());
                focusIds = focusIds.slice(0, 5);
            }
            let focusVideoData: any = await this.fitnessVideoFocusService.listRecord({status: '1',v_id: postData?.id});
            let saveFocusData = [],updateFocusData = [];
            for (let i = 0; i < focusVideoData.length; i++) {
                const {f_id} = focusVideoData[i];
                if (!focusIds.includes(String(f_id))) {
                    updateFocusData.push({v_id: postData?.id,f_id: f_id})
                }
            }
            if (updateFocusData.length > 0) {
                await this.fitnessVideoFocusService.update(updateFocusData,{status: '2'})
            }
            let focusVideoIds = focusVideoData.map(item => item.f_id.toString());
            const addFocusVideoData = focusIds.filter(item => !focusVideoIds.includes(item));
            for (let i = 0; i < addFocusVideoData.length; i++) {
                saveFocusData.push({v_id: postData?.id,f_id: addFocusVideoData[i]})
            }
            if (saveFocusData.length > 0) {
                await this.fitnessVideoFocusService.save(saveFocusData)
            }
            if (equipmentIds.length == 0) {
                let equipmentData = await this.fitnessEquipmentService.listRecord({status: '1',org_id: In([0,orgId])},['id'],{ id: 'ASC' });
                equipmentIds = equipmentData.map(item => item.id.toString());
                equipmentIds = equipmentIds.slice(0, 5);
            }
            let equipmentVideoData: any = await this.fitnessVideoEquipmentService.listRecord({status: '1',v_id: postData?.id});
            let saveEquipmentData = [],updateEquipmentData = [];
            for (let i = 0; i < equipmentVideoData.length; i++) {
                const {e_id} = equipmentVideoData[i];
                if (!equipmentIds.includes(String(e_id))) {
                    updateEquipmentData.push({v_id: postData?.id,e_id: e_id})
                }
            }
            if (updateEquipmentData.length > 0) {
                await this.fitnessVideoEquipmentService.update(updateEquipmentData,{status: '2'})
            }
            let equipmentVideoIds = equipmentVideoData.map(item => item.e_id.toString());
            const addEquipmentVideoData = equipmentIds.filter(item => !equipmentVideoIds.includes(item));
            for (let i = 0; i < addEquipmentVideoData.length; i++) {
                saveEquipmentData.push({v_id: postData?.id,e_id: addEquipmentVideoData[i]})
            }
            if (saveEquipmentData.length > 0) {
                await this.fitnessVideoEquipmentService.save(saveEquipmentData)
            }
            if (seriesIds.length == 0) {
                let seriesData = await this.fitnessSeriesService.listRecord({status: '1',org_id: In([0,orgId])},['id'],{ id: 'ASC' });
                seriesIds = seriesData.map(item => item.id.toString());
                seriesIds = seriesIds.slice(0, 5);
            }
            let seriesVideoData: any = await this.fitnessVideoSeriesService.listRecord({status: '1',v_id: postData?.id});
            let saveSeriesData = [],updateSeriesData = [];
            for (let i = 0; i < seriesVideoData.length; i++) {
                const {s_id} = seriesVideoData[i];
                if (!seriesIds.includes(String(s_id))) {
                    updateSeriesData.push({v_id: postData?.id,s_id: s_id})
                }
            }
            if (updateSeriesData.length > 0) {
                await this.fitnessVideoSeriesService.update(updateSeriesData,{status: '2'})
            }
            let seriesVideoIds = seriesVideoData.map(item => item.s_id.toString());
            const addSeriesVideoData = seriesIds.filter(item => !seriesVideoIds.includes(item));
            for (let i = 0; i < addSeriesVideoData.length; i++) {
                saveSeriesData.push({v_id: postData?.id,s_id: addSeriesVideoData[i]})
            }
            if (saveSeriesData.length > 0) {
                await this.fitnessVideoSeriesService.save(saveSeriesData)
            }
            if (instructorsIds.length == 0) {
                let instructorsData = await this.fitnessInstructorService.listRecord({status: '1',org_id: In([0,orgId])},['id'],{ id: 'ASC' });
                instructorsIds = instructorsData.map(item => item.id.toString());
                instructorsIds = instructorsIds.slice(0, 5);
            }
            let instructorsVideoData: any = await this.fitnessVideoInstructorsService.listRecord({status: '1',v_id: postData?.id});
            let saveInstructorsData = [],updateInstructorsData = [];
            for (let i = 0; i < instructorsVideoData.length; i++) {
                const {i_id} = instructorsVideoData[i];
                if (!instructorsIds.includes(String(i_id))) {
                    updateInstructorsData.push({v_id: postData?.id,i_id: i_id})
                }
            }
            if (updateInstructorsData.length > 0) {
                await this.fitnessVideoInstructorsService.update(updateInstructorsData,{status: '2'})
            }
            let instructorsVideoIds = instructorsVideoData.map(item => item.i_id.toString());
            const addInstructorsVideoData = instructorsIds.filter(item => !instructorsVideoIds.includes(item));
            for (let i = 0; i < addInstructorsVideoData.length; i++) {
                saveInstructorsData.push({v_id: postData?.id,i_id: addInstructorsVideoData[i]})
            }
            if (saveInstructorsData.length > 0) {
                await this.fitnessVideoInstructorsService.save(saveInstructorsData)
            }
            }
            if (files && files.image_thumb && files.image_thumb[0].fieldname === 'image_thumb' && files.image_thumb[0].filename) {
                files.image_thumb[0].originalname = this.commonFileService.formatFileName(files.image_thumb[0].originalname);
                await this.commonFileService.copyFile(path.resolve(files.image_thumb[0].path),path.resolve(`${files.image_thumb[0].path.split('.')[0]}_copy.${files.image_thumb[0].path.split('.')[1]}`));
                let image_thumb = structuredClone(files.image_thumb[0]);
                image_thumb.path1 = path.resolve(`${files.image_thumb[0].path.split('.')[0]}_copy.${files.image_thumb[0].path.split('.')[1]}`);
                await this.commonService.resizeImage(files.image_thumb[0].path,image_thumb.path);
                let fileName = `mevideo_` + this.commonService.generateMD5(recordDetails['id'].toString()) + '.' + files.image_thumb[0].originalname.split('.')[1]
                let image_poster = `media/video/${org_id}/mevideo_` + this.commonService.generateMD5(recordDetails['id'].toString()) + '.' + files.image_thumb[0].originalname.split('.')[1];
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(files.image_thumb[0].path),  filename: image_poster}));
                let filename = `media/video/${org_id}/thumb/mevideo_` + this.commonService.generateMD5(recordDetails['id'].toString()) + '.' + image_thumb.originalname.split('.')[1];
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(image_thumb.path1),  filename: filename}));
                postData['image_poster'] = fileName;
                postData['image_thumb'] = fileName;
                await this.fitnessVideosService.update({id: recordDetails['id']},{...postData});
            }
            if(recordDetails.org_id != org_id && org_id !=0 && org_id != undefined && org_id != null){
                let record = await this.fitnessVideoStatusService.findOne({v_id: recordDetails.id, org_id: org_id});
                if(record){
                    await this.fitnessVideoStatusService.update({id: record.id},{v_id: recordDetails.id, org_id: org_id, status: postData?.status});
                    this.activityLogService.create(record, {v_id: recordDetails.id, org_id: org_id, status: postData?.status}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_STATUS, req.tokenUser?.id);
                }
                else{
                    await this.fitnessVideoStatusService.save({v_id: recordDetails.id, org_id: org_id, status: postData?.status});
                }
                delete postData?.status;
            }
            await this.fitnessVideosService.update(where, postData);
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `fitness_video_name_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }           
            if(postData?.description && postData?.description != ' '){
                let tilte = `fitness_video_description_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.description;
            }           
            if(postData?.provider_name && postData?.provider_name != ' '){
                let tilte = `fitness_video_providername_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.provider_name;
            }           
            await this.translatorService.DynamicEngJsonData('Media',recordDetails.org_id,dynamicDatas,'Edit','Fitnessvideos','Video',recordDetails['id']);
            this.activityLogService.create(recordDetails, postData, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEOS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? "Fitness Video status updated successfully" : "Video has been updated successfully"),
            });
        } catch (error) {
            if (files && files.image_thumb && files.image_thumb[0].fieldname === 'image_thumb' && files.image_thumb[0].filename) {
                await this.commonFileService.removeFileFromLocal(files.image_thumb[0].path);
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
            postData = this.commonService.sanitizePayload(postData);
            if ((req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id)  && !postData?.search_str && !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where: any = {status: '1', org_id: '0'};
            if (postData?.org_id) {
                if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN && postData?.translation){
                    where['org_id'] = In([postData?.org_id])
                } else {
                    where['org_id'] = In([postData?.org_id, 0])
                }
            }
            if (postData?.type == 'report') {
                let companySetting = await this.companySettingsService.findOne({org_id: postData?.org_id});
                if (companySetting?.video_setting == 1) {
                    if (postData?.org_id) {
                        where['org_id'] = In([postData?.org_id])
                    }
                }
                else{
                    where['org_id'] = In([postData?.org_id, 0])
                }
            }
            if (postData?.search_str) {
                where['name'] = Like('%' + this.commonFileService.quoteEscaper(postData?.search_str) + '%');
            }
            let resultedData
            if( postData?.order && postData?.order !== null && postData?.order !== 'null'){
                if(postData?.type && postData?.type == 1 && postData?.org_id){
                    const companySetting = await this.companySettingsService.findOne({org_id: postData?.org_id});
                    if(companySetting?.video_setting == 1){
                        where['org_id'] = postData?.org_id
                    }
                }
                resultedData = await this.fitnessVideosService.listRecord(where,["fitness.id","fitness.name"],[],'fitness.id',postData?.order);
            }else{
                if(postData?.type && postData?.type == 1 && postData?.org_id){
                    const companySetting = await this.companySettingsService.findOne({org_id: postData?.org_id});
                    if(companySetting?.video_setting == 1){
                        where['org_id'] = postData?.org_id
                    }
                }
                resultedData = await this.fitnessVideosService.listRecord(where,["fitness.id","fitness.name"]);
            }
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                if (resultedData && resultedData.length) {
                    await Promise.all(resultedData.map(async (ele) => {
                        if (ele.name) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `fitness_video_name_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/Video/${ele['id']}`, `dynamic`);
                            ele.name = (customName == '' || customName == `fitness_video_name_${ele['id']}`) ? ele['name'] : customName;
                        }
                    }));
                }
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
}
