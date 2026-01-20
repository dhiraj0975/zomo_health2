import { appConstant, CommonArrayService, CommonFileService, CommonService, DaysDto, tableConstant } from '@common-constants';
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
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { fileName, filesFilter } from 'src/utils/image-upload.utils';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateDaysInput,
    DeleteChallengeInput,
    GetOneChallengeInput,
    UpdateDaysInput
} from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { DaysService } from './days.service';
const path = require('path');
@Controller('challenge/days')
@UseGuards(TokenGuard, RoleGuard)
export class DaysController {
    constructor(
        private readonly daysService: DaysService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    @Post('create')
    @UseInterceptors(
        FileInterceptor("logofile", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateDaysInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.challenge_id || !postData?.week_id) {
                if (file && file.filename && file.fieldname === 'logofile') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let dayData = await this.daysService.save({...postData});
            if (file && file.fieldname === 'logofile' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `challenge/${dayData['challenge_id']}/week/${dayData['id']}/day/chdayl_${this.commonService.generateMD5(dayData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                await this.daysService.update({ id: dayData['id']},{logofile: filename});
            }
            let dynamicDatas = Object.create(null);
            if(postData?.manual_activity && postData?.manual_activity != ' '){
                let tilte = `week_days_activity_name_${dayData['challenge_id']}_${dayData['week_id']}_${dayData['id']}`;
                dynamicDatas[`${tilte}`]= postData?.manual_activity;
            }
            if(postData?.site_activity_desc){
                let tilte = `week_days_activity_description_${dayData['challenge_id']}_${dayData['week_id']}_${dayData['id']}`;
                dynamicDatas[`${tilte}`]= postData?.site_activity_desc;
            }
            if(postData?.manual_desc){
                let tilte = `week_days_description_${dayData['challenge_id']}_${dayData['week_id']}_${dayData['id']}`;
                dynamicDatas[`${tilte}`]= postData?.manual_desc;
            }
            await this.translatorService.DynamicEngJsonData('Challenge','0',dynamicDatas,'Edit','MyChallenges',dayData['id']); 
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && file.filename && file.fieldname === 'logofile') {
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
    @Put('update')
    @UseInterceptors(
        FileInterceptor("logofile", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateDaysInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.challenge_id) {
                if (file && file.filename && file.fieldname === 'logofile') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.daysService.findOne({
                id: postData?.id,challenge_id: postData?.challenge_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (file && file.fieldname === 'logofile' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `challenge/${postData['challenge_id']}/week/${postData['id']}/day/chdayl_${this.commonService.generateMD5(postData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                postData.logofile = filename;
            }
            await this.daysService.update({ id: postData?.id, challenge_id: postData?.challenge_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_DAYS, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.manual_activity && postData?.manual_activity != ' '){
                let tilte = `week_days_activity_name_${recordDetails['challenge_id']}_${recordDetails['week_id']}_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`]= postData?.manual_activity;
            }
            if(postData?.site_activity_desc){
                let tilte = `week_days_activity_description_${recordDetails['challenge_id']}_${recordDetails['week_id']}_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`]= postData?.site_activity_desc;
            }
            if(postData?.manual_desc){
                let tilte = `week_days_description_${recordDetails['challenge_id']}_${recordDetails['week_id']}_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`]= postData?.manual_desc;
            }
            await this.translatorService.DynamicEngJsonData('Challenge','0',dynamicDatas,'Edit','MyChallenges',recordDetails['id']); 
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && file.filename && file.fieldname === 'logofile') {
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.daysService.findOne({
                id: postData?.id,challenge_id: postData?.challenge_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.daysService.update({id: postData?.id, challenge_id: postData?.challenge_id},{status: 2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.CHALLENGE.TBL_CH_DAYS, req.tokenUser?.id, 'delete');
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneChallengeInput) {
        try {
            if (!postData?.id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.daysService.findOne({id: postData?.id, challenge_id: postData?.challenge_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(DaysDto, resultedData, req.lang)
            );
            let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData['challenge_id']}/dynamic.json`);
            if(!translationMessage){
                translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData['challenge_id']}/dynamic.json`);
            }
            if(resultedData.manual_activity){
                resultedData.manual_activity = translationMessage.find((ele)=> ele.type == `week_days_activity_name_${resultedData['challenge_id']}_${resultedData['week_id']}_${resultedData['id']}`)?.['translate'] ?? resultedData.manual_activity;
            }
            if(resultedData.site_activity_desc){
                resultedData.site_activity_desc = translationMessage.find((ele)=> ele.type == `week_days_activity_description_${resultedData['challenge_id']}_${resultedData['week_id']}_${resultedData['id']}`)?.['translate'] ?? resultedData.site_activity_desc;
            }
            if(resultedData.manual_desc){
                resultedData.manual_desc = translationMessage.find((ele)=> ele.type == `week_days_description_${resultedData['challenge_id']}_${resultedData['week_id']}_${resultedData['id']}`)?.['translate'] ?? resultedData.manual_desc;
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
    @UseGuards(AccessGuard)
    @Post('list')
    async list(@Req() req: Request,@Res() res: Response, @Body() postData: any){
        try {
            let where: any = { status: 1 };            
            let results: any = await this.daysService.listRecord(where);
            results = <any>(
                await this.commonArrayService.formatToDto(DaysDto, results, req.lang)
            );
            if(results && results.length){
                let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${results[0]['challenge_id']}/dynamic.json`);
                if(!translationMessage){
                    translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Challenge/MyChallenges/0/${results[0]['challenge_id']}/dynamic.json`);
                }
                await Promise.all(results.map(async (result)=>{
                    if(result.manual_activity){
                        result.manual_activity = translationMessage.find((ele)=> ele.type == `week_days_activity_name_${result['challenge_id']}_${result['week_id']}_${result['id']}`)?.['translate'] ?? result.manual_activity;
                    }
                    if(result.site_activity_desc){
                        result.site_activity_desc = translationMessage.find((ele)=> ele.type == `week_days_activity_description_${result['challenge_id']}_${result['week_id']}_${result['id']}`)?.['translate'] ?? result.site_activity_desc;
                    }
                    if(result.manual_desc){
                        result.manual_desc = translationMessage.find((ele)=> ele.type == `week_days_description_${result['challenge_id']}_${result['week_id']}_${result['id']}`)?.['translate'] ?? result.manual_desc;
                    }
                }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: results,
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
}