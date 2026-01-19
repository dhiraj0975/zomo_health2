import { appConstant, CommonArrayService, CommonFileService, CommonService, tableConstant, UserLoginAgreementDto } from '@common-constants';
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
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateUserLoginAgreementInput, PaginateWithCompanyInput } from '../../../input';
import { fileName, imgFilter } from '../../../utils/image-upload.utils';
import { TranslationService } from '../../translation/translation.service';
import { UserLoginAgreementService } from "./userloginagreement.service";
const path = require('path');
@Controller('user-login-agreement')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class UserLoginAgreementController {
    constructor(
        private readonly userLoginAgreementService: UserLoginAgreementService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `userLoginAgreement.status != 0`;
            if(postData?.user_id){
                where += ` AND userLoginAgreement.user_id = ${postData?.user_id}`
            }
            if(postData?.org_id){
                where += ` AND userLoginAgreement.org_id = ${postData?.org_id}`
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'userLoginAgreement.user_sign');
            }
            const resultedData = await this.userLoginAgreementService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UserLoginAgreementDto, resultedData['list'], req.lang)
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
            if (!postData?.id && !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = postData?.id ? postData?.user_id ? { id: postData?.id, user_id: postData?.user_id } : { id: postData?.id}: { user_id: postData?.user_id};
            this.commonFileService.addMembershipCodeCondition(req, where)
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let recordDetails = await this.userLoginAgreementService.findOne(where);
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
                await this.commonArrayService.formatToDto(UserLoginAgreementDto, recordDetails, req.lang)
            );
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
        FileInterceptor('user_sign_image', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.USER_IMAGE_PATH}`,
                filename: fileName,
            }),
            fileFilter: imgFilter,
        }),
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserLoginAgreementInput, @UploadedFile() file: Express.Multer.File,) {
        try {
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                postData.user_sign = ' ';
            }
            if (
                !postData?.user_id ||
                !postData?.org_id ||
                !postData?.user_sign
            ) {
                if (file && file.fieldname === 'user_sign_image' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { user_id: postData?.user_id, org_id: postData?.org_id };
            let recordDetails: any = await this.userLoginAgreementService.findOne(where);
            if (recordDetails) {
                await this.userLoginAgreementService.update({id: recordDetails['id']}, postData);
            }
            else{
                recordDetails = await this.userLoginAgreementService.save(postData);
            } 
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `user/loginagreement/${recordDetails['org_id']}/signimg_${this.commonService.generateMD5(recordDetails['user_id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                await this.userLoginAgreementService.update({ id: recordDetails['id']},{user_sign_image: filename});
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
            const where = { id: postData?.id };
            this.commonFileService.addMembershipCodeCondition(req, where)
            const recordDetails = await this.userLoginAgreementService.findOne(where);
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
            await this.userLoginAgreementService.update(where, { status: 2 });
            if(recordDetails.user_sign_image){
                await lastValueFrom(this.commonMicroservice.send({cmd: 'delete_file'}, {prefix: recordDetails.user_sign_image}));
            }
            this.activityLogService.create(recordDetails, postData, tableConstant.TBL_USER_LOGIN_AGREEMENT, req.tokenUser?.id, 'delete');
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
        })
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserLoginAgreementInput, @UploadedFile() file: Express.Multer.File,) {
        try {
            if (
                !postData?.id ||
                !postData?.user_id
            ) {
                if (file && file.fieldname === 'user_sign_image' && file.filename) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            this.commonFileService.addMembershipCodeCondition(req, where)
            const recordDetails = await this.userLoginAgreementService.findOne(where);
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
            if (file && file.fieldname === 'user_sign_image' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                let filename = `user/loginagreement/${recordDetails['org_id']}/signimg_${this.commonService.generateMD5(recordDetails['user_id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                postData['user_sign_image'] = filename;
            }
            await this.userLoginAgreementService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.TBL_USERS, req.tokenUser?.id);
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
            const where = {};
            let resultedData = await this.userLoginAgreementService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UserLoginAgreementDto, resultedData, req.lang)
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
