import { fileName, imgFilter } from '@/utils/image-upload.utils';
import { appConstant, CommonArrayService, CommonFileService, CommonService, SpouseAgreementDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post, Put,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from "@nestjs/common";
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateSpouseAgreementInput, PaginateWithSpouseInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { SpouseAgreementService } from "./spouseAgreement.service";
const path = require('path');
@Controller('spouse-agreement')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class SpouseAgreementController {
    constructor(
        private readonly spouseAgreementService: SpouseAgreementService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService, 
        private readonly activityLogService: ActivityLogService,
        private readonly commonFileService: CommonFileService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
    ) {
    }
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithSpouseInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `status !=0 `;
            if(postData?.org_id){
                where +=`AND spouseAgreement.org_id = '${postData?.org_id}'`;
            }
            if(postData?.user_id){
                where +=` AND spouseAgreement.user_id = '${postData?.user_id}'`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'spouseAgreement.signed');
            }
            const resultedData = await this.spouseAgreementService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(SpouseAgreementDto, resultedData['list'], req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.user_id ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.user_id ? { id: postData?.id, user_id: postData?.user_id } : { id: postData?.id}: { user_id: postData?.user_id};
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let biometricDetails = await this.spouseAgreementService.findOne(where);
            if (!biometricDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            biometricDetails = <any>(
                await this.commonArrayService.formatToDto(SpouseAgreementDto, biometricDetails, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: biometricDetails,
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
        FileInterceptor('user_sign_image', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.USER_IMAGE_PATH}`,
                filename: fileName,
            }),
            fileFilter: imgFilter,
        }),
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSpouseAgreementInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                postData.signed = ' ';
            }
            if (
                !postData?.org_id ||
                !postData?.user_id ||
                !postData?.signed
            ) {
                if (file && file.fieldname === 'user_sign_image' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let recordDetails = await this.spouseAgreementService.save(postData);
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `user/spouseagreement/${recordDetails['org_id']}/signimg_${this.commonService.generateMD5(recordDetails['user_id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                await this.spouseAgreementService.update({ id: recordDetails['id']},{user_sign_image: filename});
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.spouseAgreementService.findOne(where);
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
            await this.spouseAgreementService.update(where,{status: 2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.COMPANIES.TBL_COMPANY_SPOUSE_AGREEMENTS, req.tokenUser?.id, 'delete');
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
    @Put('update')
    @UseInterceptors(
        FileInterceptor('user_sign_image', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.USER_IMAGE_PATH}`,
                filename: fileName,
            }),
            fileFilter: imgFilter,
        }),
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateSpouseAgreementInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (
                !postData?.id
            ) {
                if (file && file.fieldname === 'user_sign_image' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = {id: postData?.id};
            const recordDetails = await this.spouseAgreementService.findOne(where);
            if (!recordDetails) {
                await this.spouseAgreementService.save({
                    ...postData,
                    created_by: req.tokenUser?.id
                });
            }
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `user/spouseagreement/${recordDetails['org_id']}/signimg_${this.commonService.generateMD5(recordDetails['user_id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                postData['user_sign_image'] = filename;
            }
            await this.spouseAgreementService.update(where, {...postData, updated_by : req.tokenUser?.id});
            this.activityLogService.create(recordDetails, {...postData, updated_by : req.tokenUser?.id}, tableConstant.COMPANIES.TBL_COMPANY_SPOUSE_AGREEMENTS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'success',
            });
        } catch (error) {
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                await this.commonFileService.removeFileFromLocal(file.path);
            }
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = {
                status: 1,
            };
            let resultedData = await this.spouseAgreementService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(SpouseAgreementDto, resultedData, req.lang)
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
}