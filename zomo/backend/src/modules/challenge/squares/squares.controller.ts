import { appConstant, CommonArrayService, CommonFileService, CommonService, SquaresDto, tableConstant } from '@common-constants';
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
    CreateSquaresInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    PaginateWithChallengeInput,
    UpdateSquaresInput,
} from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { SquaresService } from './squares.service';
const path = require('path');
@Controller('challenge/squares')
@UseGuards(TokenGuard, RoleGuard)
export class SquaresController {
    constructor(
        private readonly squaresService: SquaresService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithChallengeInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = '';
            if(req.tokenUser?.role_id == appConstant.ROLE.ADMIN || appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                where = `square.status != 2 AND square.org_id = 0 AND square.schedule_id = 0`; 
            } else if (req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN){
                where = `square.status != 2`; 
            } else {
                where = `square.status = 1`;
            }
            if (postData?.card_id) {
                where += ` AND square.card_id = ${postData?.card_id}`;
            }
            if (postData?.schedule_id) {
                where += ` AND square.schedule_id = ${postData?.schedule_id}`;
            }
            if (postData?.org_id) {
                where += ` AND square.org_id = ${postData?.org_id}`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['square.name','square.logo','square.description']);
            }
            let resultedData = await this.squaresService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(SquaresDto, resultedData['list'], req.lang)
            );
            if(![appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)){
                await Promise.all(resultedData['list'].map(async (ele) => {
                    if(ele.name){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`square_name_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                        ele.name = (customeName == '' || customeName == `square_name_${ele.schedule_id}_${ele['id']}`) ? ele['name'] : customeName;
                    }
                    if(ele.description){
                        let customeName = await this.translatorService.frontendReadTranslation(req.lang,`square_description_${ele.schedule_id}_${ele['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${ele.org_id}/${ele.schedule_id}`,`dynamic`);
                        ele.description = (customeName == '' || customeName == `square_description_${ele.schedule_id}_${ele['id']}`) ? ele['description'] : customeName;
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
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    @UseInterceptors(
        FileInterceptor("logo", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSquaresInput, @UploadedFile() file: Express.Multer.File) {
        try {
            postData['org_id'] = postData?.org_id ?? 0;
            if ((postData?.schedule_id == undefined || postData?.schedule_id == null) || (postData?.org_id == undefined || postData?.org_id == null) || (postData?.card_id == undefined || postData?.card_id == null) || !postData?.name) {
                if (file && file.filename && file.fieldname === 'logo') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData['logo'] = ' ';
            postData['description'] = postData?.description ?? ' ';
            if([appConstant.ROLE.ORGADMIN , appConstant.ROLE.ADMIN, appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)){
                postData['status'] = postData['status'] ?? 1; 
            }
            const squareData = await this.squaresService.save({...postData});
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `square_name_${postData?.schedule_id}_${squareData['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }            
            if(postData?.description){
                let tilte = `square_description_${postData?.schedule_id}_${squareData['id']}`
                dynamicDatas[`${tilte}`]= postData?.description;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',postData?.org_id,dynamicDatas,'Edit','MyChallenges',postData['schedule_id']);
            if(squareData){
                if (file && file.fieldname === 'logo' && file.filename) {
                    file.originalname = this.commonFileService.formatFileName(file.originalname);
                    file.filename = postData?.schedule_id != 0 ? `/challenge/schedulech/${squareData['schedule_id']}/square/` + `chsquarel_${this.commonService.generateMD5(squareData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}` : '/challenge/squares/' + `squarel_${this.commonService.generateMD5(squareData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                    postData['logo'] = file.filename;
                    await this.squaresService.update({id: squareData['id']},{logo: postData?.logo})
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Square has been successfully saved.')
            });
        } catch (error) {
            if (file && file.fieldname === 'logo' && file.filename) {
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
        FileInterceptor("logo", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateSquaresInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || (postData?.schedule_id == undefined || postData?.schedule_id == null)) {
                if (file && file.filename && file.fieldname === 'logo') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.squaresService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (file && file.fieldname === 'logo' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = recordDetails?.schedule_id != 0 ? 
                `/challenge/schedulech/${recordDetails['schedule_id']}/square/` + `chsquarel_${this.commonService.generateMD5(recordDetails['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}` 
                : '/challenge/squares/' + `squarel_${this.commonService.generateMD5(recordDetails['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['logo'] = file.filename;
            }
            let dynamicDatas = Object.create(null);
            if(postData?.name){
                let tilte = `square_name_${postData?.schedule_id}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.name;
            }            
            if(postData?.description){
                let tilte = `square_description_${postData?.schedule_id}_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.description;
            }            
            await this.translatorService.DynamicEngJsonData('Challenge',postData?.org_id,dynamicDatas,'Edit','MyChallenges',postData['schedule_id']);
            await this.squaresService.update({ id: postData?.id, schedule_id: postData?.schedule_id},{...postData});
            this.activityLogService.create(recordDetails, postData, tableConstant.CHALLENGE.TBL_CH_SQUARES, req.tokenUser?.id);
            let message;
            if(Object.keys(postData).length && postData?.hasOwnProperty('status')){
                message = 'Square status change succesfully'; 
            } 
            else{
                message =  'Square has been successfully updated.';
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,message)
            });
        } catch (error) {
            if (file && file.fieldname === 'logo' && file.filename) {
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
            if (!postData?.id || (postData?.schedule_id == undefined || postData?.schedule_id == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.squaresService.findOne({
                id: postData?.id,schedule_id: postData?.schedule_id
            });
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.squaresService.update({id: postData?.id, schedule_id: postData?.schedule_id},{status:2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_SQUARES, req.tokenUser?.id,'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Square remove successfully'),
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
            if (!postData?.id || (postData?.schedule_id == undefined || postData?.schedule_id == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.squaresService.findOne({id: postData?.id, schedule_id: postData?.schedule_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(SquaresDto, resultedData, req.lang)
            );
            if(resultedData.name){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`square_name_${resultedData.schedule_id}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${resultedData.org_id}/${resultedData.schedule_id}`,`dynamic`);
                resultedData.name = (customeName == '' || customeName == `square_name_${resultedData.schedule_id}_${resultedData['id']}`) ? resultedData['name'] : customeName;
            }
            if(resultedData.description){
                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`square_description_${resultedData.schedule_id}_${resultedData['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${resultedData.org_id}/${resultedData.schedule_id}`,`dynamic`);
                resultedData.description = (customeName == '' || customeName == `square_description_${resultedData.schedule_id}_${resultedData['id']}`) ? resultedData['description'] : customeName;
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
}