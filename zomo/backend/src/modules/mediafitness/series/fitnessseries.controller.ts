import { appConstant, CommonArrayService, CommonFileService, CommonService, imageConstant, MediaFitnessSeriesDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post, Put,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { fileName, imgFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { PaginationWithMediaFitnessInput } from '../input';
import { FitnessVideoSeriesService } from "../videoseries/fitnessvideoseries.service";
import { FitnessSeriesService } from "./fitnessseries.service";
import { CreateMediaFitnessSeriesInput } from './input';
@Controller('media-fitness/series')
@UseGuards(TokenGuard, RoleGuard)
export class FitnessSeriesController {
    constructor(
        private readonly fitnessSeriesService: FitnessSeriesService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly fitnessVideoSeriesService: FitnessVideoSeriesService,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationWithMediaFitnessInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER,appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) ? 'fitness.status != 2 ' : 'fitness.status = 1 ';
            if(postData?.org_id){
                where +=`AND fitness.org_id In(0,${postData?.org_id}) `;
            }
            if(postData?.s_id){
                where +=`AND fitness.s_id = '${postData?.s_id}' `;
            }
            if (postData?.search_str) {
                where += `AND(fitness.code LIKE '%${postData?.search_str}%' OR fitness.name LIKE '%${postData?.search_str}%' OR fitness.img LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.fitnessSeriesService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessSeriesDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.name){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_series_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/series}`,`dynamic`);
                        ele.name = (customeName == '' || customeName == `fitness_series_${ele['id']}`) ? ele['name'] : customeName;
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
            let seriesData = await this.fitnessSeriesService.findOne(where);
            if (!seriesData) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            seriesData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessSeriesDto, seriesData, req.lang)
            );
            if(seriesData.name){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_series_${seriesData['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${seriesData['org_id']}/series}`,`dynamic`);
                seriesData.name = (customeName == '' || customeName == `fitness_series_${seriesData['id']}`) ? seriesData['name'] : customeName;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: seriesData,
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
        FileInterceptor('img', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.FITNESS_IMAGE_PATH}`,
                filename: fileName,
            }),
            fileFilter: imgFilter,
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaFitnessSeriesInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (
                !postData?.org_id
            ) {
                if (file && file.fieldname === 'img' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData['img'] = imageConstant.FITNESS;
            if (file && file.fieldname === 'img' && file.filename) {
                postData['img'] = '/fitness/' + file.filename;
            }
            if(postData?.name){
                postData['code'] = postData?.name.toLowerCase().replace(/ /g, "-");
                let where = {name: postData?.name, org_id: postData?.org_id, status: Not(2)};
                const categoryCheck = await this.fitnessSeriesService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
                }
            }
            let resultedData = await this.fitnessSeriesService.save({...postData,
                created_by: req.tokenUser?.id
            });
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `fitness_series_${resultedData['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Fitnessvideos','series');
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Series has been added successfully"),
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.fitnessSeriesService.findOne(where);
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
            await this.fitnessSeriesService.update(where,{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_SERIES, req.tokenUser?.id, 'delete');
            let videoSeriesData = await this.fitnessVideoSeriesService.listRecord({s_id: postData?.id, status: Not('2')});
            await this.fitnessVideoSeriesService.update({s_id: postData?.id, status: Not('2')},{status:2});
            await this.activityLogService.create(videoSeriesData, {status:2}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_SERIES, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "Series has been deleted successfully"),
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
            fileFilter: imgFilter,
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMediaFitnessSeriesInput, @UploadedFile() file: Express.Multer.File) {
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
            let recordDetails: any = await this.fitnessSeriesService.findOne(where);
            if(postData?.name){
                postData['code'] = postData?.name.toLowerCase().replace(/ /g, "-");
                let where = { name: postData?.name, org_id: recordDetails.org_id, status: Not(2) };
                const categoryCheck = await this.fitnessSeriesService.findOne(where);
                if (categoryCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "This name has already been used."));
                }
            }
            if (!recordDetails) {
                recordDetails = await this.fitnessSeriesService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            if (file && file.fieldname === 'img' && file.filename) {
                postData['img'] = '/fitness/' + file.filename;
            }
            await this.fitnessSeriesService.update(where, postData);
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `fitness_series_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }                      
            await this.translatorService.DynamicEngJsonData('Media',postData?.org_id,dynamicDatas,'Edit','Fitnessvideos','series');
            this.activityLogService.create(recordDetails, postData, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_SERIES, req.tokenUser?.id);
            let videoSeriesData = await this.fitnessVideoSeriesService.listRecord({s_id: postData?.id});
            await this.fitnessVideoSeriesService.update({s_id: postData?.id},{status:postData?.status});
            await this.activityLogService.create(videoSeriesData, {status:postData?.status}, tableConstant.MEDIA_FITNESS.TBL_ME_FOD_VIDEO_SERIES, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, ((postData?.status != undefined || postData?.status != null) && postData?.status != recordDetails.status) ? "Fiteness Series status updated successfully" : "Series has been updated successfully"),
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = { status: 1 };
            if(postData?.org_id){
                where['org_id'] = In([0,postData?.org_id]);
            }
            let resultedData = await this.fitnessSeriesService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MediaFitnessSeriesDto, resultedData, req.lang)
            );
            if(resultedData && resultedData.length){
                await Promise.all(resultedData.map(async (ele)=>{
                    if(ele.name){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`fitness_series_${ele['id']}`, `/LC_MESSAGES/Media/Fitnessvideos/${ele['org_id']}/series}`,`dynamic`);
                        ele.name = (customeName == '' || customeName == `fitness_series_${ele['id']}`) ? ele['name'] : customeName;
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
}