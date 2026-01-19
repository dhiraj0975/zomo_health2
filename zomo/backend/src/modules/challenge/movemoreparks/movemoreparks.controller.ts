import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, MoveMoreParksDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res, UploadedFiles,
    UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateMoveMoreParksInput,
    DeleteChallengeInput,
    GetoneChallengeInput,
    UpdateMoveMoreParksInput,
} from "../../../input";
import { fileNameUUID, imgFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { MoveMoreParksService } from './movemoreparks.service';
const S3_URL =  process.env.S3_URL_PROD;
const path = require('path');
@Controller('challenge/move-more-parks')
@UseGuards(TokenGuard, RoleGuard)
export class MoveMoreParksController {
    constructor(
        private readonly moveMoreParksService: MoveMoreParksService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    @Post('create')
    @UseInterceptors(
        AnyFilesInterceptor( {
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileNameUUID
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateMoveMoreParksInput, @UploadedFiles() file: Record<string, any>) {
        try {
            if (!postData?.org_id || !postData?.schedule_id || !postData?.park_name) {
                if (file && Object.keys(file).length > 0) {
                    for(let fileData of Object.keys(file)){
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);  
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            postData.parks = postData?.parks ? JSON.parse(postData?.parks) : []; 
            if (file && Object.keys(file).length > 0) {
                let parks = {};
                for (const item of file.map(e=>e)) {
                    const match = item.fieldname.match(/park\[(\d+)\]/);
                    if (match) {
                        const parkIndex = match[1];
                        if (!parks[parkIndex]) {
                            parks[parkIndex] = [];
                        }
                        parks[parkIndex].push(item);
                    }
                }
                const images = Object.values(file);
                let i = 0;
                for (const item of images) {
                    parks[i]['file'] = item ?? [];
                    i++;
                }
            }    
            for(let park of postData?.parks){
                park['org_id'] = park['org_id'] ?? postData?.org_id;
                park['schedule_id'] = park['schedule_id'] ?? postData?.schedule_id;
                const imageData = {};
                if(!park.id){
                    let file = park.file;
                    delete park.file;
                    park['image'] = '';
                    let savedRecord = await this.moveMoreParksService.save(park);
                    park = {...park, id:  savedRecord['id'], file: file}
                }
                for (const image of park?.file) {
                    let timestamp = this.commonDateService.getTodayDate().format('YYYYMMDDHHmmssSSS');
                    if(image.fieldname.includes('corner')){
                        image.originalname = this.commonFileService.formatFileName(image.originalname);
                        let filename = `challenge/schedulech/${park['schedule_id']}/parks/icons/scchaparki_${this.commonService.generateMD5(park['id'].toString())}.${image.originalname.split('.')[image.originalname.split('.').length - 1]}`;
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(image.path),  filename: filename}));
                        if(imageData['corner']?.length > 0){
                            imageData['corner'].push(filename);
                        }
                        else{
                            imageData['corner'] = [filename]
                        }
                    }
                    else{
                        image.originalname = this.commonFileService.formatFileName(image.originalname);
                        let filename = `challenge/schedulech/${park['schedule_id']}/parks/logo/scchaparkl_${this.commonService.generateMD5(park['id'].toString())}_${timestamp}.${image.originalname.split('.')[image.originalname.split('.').length - 1]}`;
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(image.path),  filename: filename}));
                        if(imageData['image']?.length > 0){
                            imageData['image'].push(filename);
                        }
                        else{
                            imageData['image'] = [filename]
                        }
                    }
                }
                if(imageData['image']?.length > 0){
                    imageData['image'] = imageData['image'].join(',');
                }
                if(imageData['corner']?.length > 0){
                    imageData['corner'] = imageData['corner'].join(',');
                }
                park = {...park, ...imageData};
                delete park.file;
                await this.moveMoreParksService.update({id: park.id},park);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                for(let fileData of Object.keys(file)){
                    await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);  
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
    @Put('update')
    @UseInterceptors(
        AnyFilesInterceptor( {
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_IMAGE_PATH}`,
                filename: fileNameUUID
            }),
            fileFilter: imgFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateMoveMoreParksInput, @UploadedFiles() file: Record<string, any>) {
        try {
            if (!postData?.org_id || !postData?.schedule_id) {
                if (file && Object.keys(file).length > 0) {
                    for(let fileData of Object.keys(file)){
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);  
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let parks = postData?.parks ? JSON.parse(postData?.parks) : [];     
            if (file && Object.keys(file).length > 0) {
                let park = {};
                for (const item of file.map(e=>e)) {
                    const match = item.fieldname.match(/park\[(\d+)\]/);
                    if (match) {
                        const parkIndex = match[1];
                        if (!park[parkIndex]) {
                            park[parkIndex] = [];
                        }
                        park[parkIndex].push(item);
                    }
                }
                for (const parkIndex in park) {
                    const index = parseInt(parkIndex, 10); 
                    if (parks[index] !== undefined) {
                        parks[index]['file'] = park[parkIndex]; 
                    }
                }
            }
            for(let park of parks){
                park['org_id'] = park['org_id'] ?? postData?.org_id;
                park['schedule_id'] = park['schedule_id'] ?? postData?.schedule_id;
                const recordDetails = await this.moveMoreParksService.findOne({ id: park.id, schedule_id: park.schedule_id });
                if(park['image'] && park['image'].includes(S3_URL)){
                    park['image'] = park['image'].replaceAll(S3_URL,'');
                    park['image'] = park['image'].split(',').map(path => path.trim()).filter(path => !path.includes(S3_URL)).join(',');
                }
                if(park?.image == '' && recordDetails['image'] && recordDetails['image'] != ''){
                    park['image'] = recordDetails['image'];
                }
                const imageData = {};
                if(!park.id){
                    let file = park.file;
                    delete park.file;
                    park['image'] = '';
                    let savedRecord = await this.moveMoreParksService.save(park);
                    park = {...park, id:  savedRecord['id'], file: file}
                }
                if(park?.file && park?.file.length){
                    for (const image of park.file) {
                        let timestamp = this.commonDateService.getTodayDate().format('YYYYMMDDHHmmssSSS');
                        if(image.fieldname.includes('corner')){
                            image.originalname = this.commonFileService.formatFileName(image.originalname);
                            let filename = `challenge/schedulech/${park['schedule_id']}/parks/icons/scchaparki_${this.commonService.generateMD5(park['id'].toString())}.${image.originalname.split('.')[image.originalname.split('.').length - 1]}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(image.path),  filename: filename}));
                            if(imageData['corner']?.length > 0){
                                imageData['corner'].push(filename);
                            }
                            else{
                                imageData['corner'] = [filename]
                            }
                        }
                        else{
                            if((!imageData['image'] || imageData['image']?.length == 0) && park['image']?.length > 0){
                                imageData['image'] = JSON.parse(JSON.stringify(park['image'].split(',')));
                            }
                            image.originalname = this.commonFileService.formatFileName(image.originalname);
                            let filename = `challenge/schedulech/${park['schedule_id']}/parks/logo/scchaparkl_${this.commonService.generateMD5(park['id'].toString())}_${timestamp}.${image.originalname.split('.')[image.originalname.split('.').length - 1]}`;
                            await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(image.path),  filename: filename}));
                            if(imageData['image']?.length > 0){
                                imageData['image'].push(filename);
                            }
                            else{
                                imageData['image'] = [filename]
                            }
                        }
                    }
                    if(imageData['image']?.length > 0){
                        imageData['image'] = imageData['image'].join(',');
                    }
                }
                park = {...park, ...imageData};
                delete park.file;
                await this.moveMoreParksService.update({ id: park.id, schedule_id: postData?.schedule_id },{...park});
                this.activityLogService.create(recordDetails, park, tableConstant.CHALLENGE.TBL_CH_MOVE_MORE_PARKS, req.tokenUser?.id);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                for(let fileData of Object.keys(file)){
                    await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);  
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteChallengeInput) {
        try {
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
            }
            const recordDetails = await this.moveMoreParksService.findOne({id: postData?.id,schedule_id: postData?.schedule_id});
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            await this.moveMoreParksService.update({id: postData?.id,schedule_id: postData?.schedule_id},{status:2});
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_MOVE_MORE_PARKS, req.tokenUser?.id,'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang,'Location deleted successfully', `/LC_MESSAGES/Challenge/MyChallenges`,`static`)
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
            if (!postData?.id || !postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.moveMoreParksService.findOne({id: postData?.id,schedule_id: postData?.schedule_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(MoveMoreParksDto, resultedData, req.lang)
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
    @Post('list')
    async list(@Req() req: Request ,@Res() res: Response, @Body() postData: any){
        try {
            let where: any = { status: 1};            
            let result = await this.moveMoreParksService.listRecord(where);
            result = <any>(
                await this.commonArrayService.formatToDto(MoveMoreParksDto, result, req.lang)
            );
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