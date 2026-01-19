import { appConstant, CommonArrayService, CommonFileService, CommonService, tableConstant, WeeksDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateWeeksInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    UpdateWeeksInput,
} from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { WeeksService } from './weeks.service';
const path = require('path');
@Controller('challenge/weeks')
@UseGuards(TokenGuard, RoleGuard)
export class WeeksController {
    constructor(
        private readonly weeksService: WeeksService,
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
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateWeeksInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.challenge_id || !postData?.activity_id) {
                if (file && file.filename && file.fieldname === 'logofile') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let weekResult = await this.weeksService.save({...postData});
            if (file && file.fieldname === 'logofile' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `challenge/${postData?.challenge_id}/week/${weekResult['id']}/chweekl_${this.commonService.generateMD5(weekResult['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename}));
                await this.weeksService.update({ id: weekResult['id']},{logofile: filename});
            }
            let dynamicDatas = Object.create(null);
            if(postData?.manual_activity && postData?.manual_activity != ' '){
                let tilte = `week_activity_name_${weekResult['challenge_id']}_${weekResult['id']}`;
                dynamicDatas[`${tilte}`]= postData?.manual_activity;
            }
            if(postData?.site_activity_desc){
                let tilte = `week_activity_description_${weekResult['challenge_id']}_${weekResult['id']}`;
                dynamicDatas[`${tilte}`]= postData?.site_activity_desc;
            }
            if(postData?.manual_desc){
                let tilte = `week_description_${weekResult['challenge_id']}_${weekResult['id']}`;
                dynamicDatas[`${tilte}`]= postData?.manual_desc;
            }
            if(postData?.tabmanual){
                let tilte = `week_tabmanual_${weekResult['challenge_id']}_${weekResult['id']}`;
                dynamicDatas[`${tilte}`]= postData?.tabmanual;
            }
            await this.translatorService.DynamicEngJsonData('Challenge','0',dynamicDatas,'Edit','MyChallenges',weekResult['id']); 
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && file.fieldname === 'logofile' && file.filename) {
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
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateWeeksInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.challenge_id) {
                if (file && file.filename && file.fieldname === 'logofile') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.weeksService.findOne({
                id: postData?.id,challenge_id: postData?.challenge_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (file && file.fieldname === 'logofile' && file.filename) {
                const filename = `challenge/${postData?.challenge_id}/week/${postData['id']}/chweekl_${this.commonService.generateMD5(postData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                postData.logofile = filename;
            }
            await this.weeksService.update({ id: postData?.id, challenge_id: postData?.challenge_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_WEEKS, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.manual_activity && postData?.manual_activity != ' '){
                let tilte = `week_activity_name_${recordDetails['challenge_id']}_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`]= postData?.manual_activity;
            }
            if(postData?.site_activity_desc){
                let tilte = `week_activity_description_${recordDetails['challenge_id']}_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`]= postData?.site_activity_desc;
            }
            if(postData?.manual_desc){
                let tilte = `week_description_${recordDetails['challenge_id']}_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`]= postData?.manual_desc;
            }
            if(postData?.tabmanual){
                let tilte = `week_tabmanual_${recordDetails['challenge_id']}_${recordDetails['id']}`;
                dynamicDatas[`${tilte}`]= postData?.tabmanual;
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
            if (file && file.fieldname === 'logofile' && file.filename) {
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
            const recordDetails = await this.weeksService.findOne({
                id: postData?.id,challenge_id: postData?.challenge_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.weeksService.update({id: postData?.id, challenge_id: postData?.challenge_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.CHALLENGE.TBL_CH_WEEKS, req.tokenUser?.id,'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetoneChallengeInput) {
        try {
            if (!postData?.id || !postData?.challenge_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.weeksService.findOne({id: postData?.id, challenge_id: postData?.challenge_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(WeeksDto, resultedData, req.lang)
            );
            let translationMessage = await this.translatorService.readTranslation(req.lang || 'eng', `/LC_MESSAGES/Challenge/MyChallenges/${resultedData['org_id']??0}/${resultedData['challenge_id']}/dynamic.json`);
            if(!translationMessage){
                translationMessage = await this.translatorService.readTranslation('eng', `/LC_MESSAGES/Challenge/MyChallenges/${resultedData['org_id']??0}/${resultedData['challenge_id']}/dynamic.json`);
            }
            if(resultedData.manual_activity){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang, `week_activity_name_${resultedData['challenge_id']}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData['challenge_id']}`,`dynamic`);
                if (customeName != `week_activity_name_${resultedData['challenge_id']}_${resultedData['id']}`) {
                    resultedData.manual_activity = customeName;
                }
            }
            if(resultedData.site_activity_desc){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang, `week_activity_description_${resultedData['challenge_id']}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData['challenge_id']}`,`dynamic`);
                if (customeName != `week_activity_description_${resultedData['challenge_id']}_${resultedData['id']}`) {
                    resultedData.site_activity_desc = customeName;
                }
            }
            if(resultedData.manual_desc){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang, `week_description_${resultedData['challenge_id']}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData['challenge_id']}`,`dynamic`);
                if (customeName != `week_description_${resultedData['challenge_id']}_${resultedData['id']}`) {
                    resultedData.manual_desc = customeName;
                }
            }
            if(resultedData.tabmanual){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang, `week_tabmanual_${resultedData['challenge_id']}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${resultedData['challenge_id']}`,`dynamic`);
                if (customeName != `week_tabmanual_${resultedData['challenge_id']}_${resultedData['id']}`) {
                    resultedData.tabmanual = customeName;
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
            let where = { status: 1};           
            if(postData?.challenge_id){
                where['challenge_id'] = postData?.challenge_id;
            }                
            if(postData?.activity_id){
                where['activity_id'] = postData?.activity_id;
            }                
            let result: any = await this.weeksService.listRecord(where);
            result = <any>(
                await this.commonArrayService.formatToDto(WeeksDto, result, req.lang)
            );
            if(result && result.length){
                await Promise.all(result.map(async (ele)=>{
                    if(ele.manual_activity){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `week_activity_name_${ele['challenge_id']}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,`dynamic`);
                        if (customeName != `week_activity_name_${ele['challenge_id']}_${ele['id']}`) {
                            ele.manual_activity = customeName;
                        }
                    }
                    if(ele.site_activity_desc){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `week_activity_description_${ele['challenge_id']}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,`dynamic`);
                        if (customeName != `week_activity_description_${ele['challenge_id']}_${ele['id']}`) {
                            ele.site_activity_desc = customeName;
                        }
                    }
                    if(ele.manual_desc){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `week_description_${ele['challenge_id']}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,`dynamic`);
                        if (customeName != `week_description_${ele['challenge_id']}_${ele['id']}`) {
                            ele.manual_desc = customeName;
                        }
                    }
                    if(ele.tabmanual){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang, `week_tabmanual_${ele['challenge_id']}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['challenge_id']}`,`dynamic`);
                        if (customeName != `week_tabmanual_${ele['challenge_id']}_${ele['id']}`) {
                            ele.tabmanual = customeName;
                        }
                    }
                }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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