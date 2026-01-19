import { appConstant, CommonArrayService, CommonFileService, CommonService, tableConstant, UserFormsAttachmentsDto } from '@common-constants';
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
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateUserFormsAttachmentsInput,
    DeleteUserFormsAttachmentsInput,
    GetOneUserFormsAttachmentsInput,
    ListUserFormsAttachmentsInput,
    PaginateWithCompanyInput,
    UpdateUserFormsAttachmentsInput
} from "../../../input";
import { fileName, filesFilter } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { UserFormsAttachmentsService } from './userformsattachments.service';
const path = require('path');
@Controller('health-checkup/user-forms-attachments')
@UseGuards(TokenGuard, RoleGuard)
export class UserFormsAttachmentsController {
    constructor(
        private readonly userFormsAttachmentsService: UserFormsAttachmentsService,
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
    async paginate(@Req() req, @Res() res, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `userformsattachments.status = '1'`;
            if (postData?.search_str) {
                where += `${where.length !== 0 ? ' AND' : ''} (userformsattachments.name LIKE '%${postData?.search_str}%' OR userforms.status LIKE '%${postData?.search_str}%')`;
            }
            let resultedData = await this.userFormsAttachmentsService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(UserFormsAttachmentsDto, resultedData['list'], req.lang)
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    @Post('create')
    @UseInterceptors(
        FileInterceptor("attachments", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.HEALTH_CHECKUP_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateUserFormsAttachmentsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!file || !postData?.org_id || !postData?.user_id) {
                if (file && file.filename && file.fieldname === 'attachments') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            postData['name'] = ' ';
            let lastInsertId = await this.userFormsAttachmentsService.save({...postData});
            if (file && file.fieldname === 'attachments' && file.filename) {
                file.originalname = this.commonFileService.formatFileName(file.originalname);
                file.filename = `healthcheckup/healthforms/${postData?.org_id.toString()}/${postData?.user_id.toString()}/${this.commonService.generateMD5(lastInsertId['id'].toString())}${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename}));
                postData['name'] = file.filename;
            }
            let resultedData = {};
            if (lastInsertId['id']) {
                resultedData = {'id' : lastInsertId['id']};
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success'
            });
        } catch (error) {
            if (file && file.fieldname === 'attachments' && file.filename) {
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
        FileInterceptor("attachments", {
            limits: { fileSize: appConstant.FILE_SIZE_2MB },
            storage: diskStorage({
                destination: `${appConstant.HEALTH_CHECKUP_IMAGE_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard  
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateUserFormsAttachmentsInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || (postData?.status == undefined || postData?.status == null) || !file) {
                if (file && file.filename && file.fieldname === 'attachments') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if (file && file.fieldname === 'attachments' && file.filename) {
                postData.attachments = '/health_checkup/' + file.filename;
            }
            const recordDetails = await this.userFormsAttachmentsService.findOne({ id: postData?.id});
            await this.userFormsAttachmentsService.update({ id: postData?.id},{name: postData?.attachments,status: postData?.status});
            this.activityLogService.create(recordDetails, {name: postData?.attachments,status: postData?.status}, tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORM_ATTACHMENTS, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'success'
            });
        } catch (error) {
            if (file && file.fieldname === 'attachments' && file.filename) {
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: DeleteUserFormsAttachmentsInput) {
        try {
            if (!postData?.user_form_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const where = { user_form_id: postData?.user_form_id };
            const recordDetails = await this.userFormsAttachmentsService.findOne(where);
            if (!recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_RECORD_NOT_FOUND'));
            }
            await this.userFormsAttachmentsService.update({ user_form_id: postData?.user_form_id},{status:2});
            this.activityLogService.create(recordDetails, {status:2}, tableConstant.HEALTH_CHECKUP.TBL_HC_USER_FORM_ATTACHMENTS, req.tokenUser?.id, 'delete');
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneUserFormsAttachmentsInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.userFormsAttachmentsService.findOne({id: postData?.id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UserFormsAttachmentsDto, resultedData, req.lang)
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
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: ListUserFormsAttachmentsInput) {
        try {
            if (!postData?.user_form_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData = await this.userFormsAttachmentsService.listRecord(["id","user_form_id","name","status"],{...postData});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(UserFormsAttachmentsDto, resultedData, req.lang)
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
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
