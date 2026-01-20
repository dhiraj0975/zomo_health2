import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, CovidPassportUserDto, tableConstant } from '@common-constants';
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
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { fileName, filesFilter } from "src/utils/image-upload.utils";
import { Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from "../../../guard";
import { CreateCovidPassportUserInput, PaginateCovidPassportInput } from "../../../input";
import { TranslationService } from "../../translation/translation.service";
import { PassportSettingsService } from "../passportSettings/passportSettings.service";
import { PassportUsersService } from "./passportUsers.service";
const path = require('path');
@Controller('covid/passport-users')
@UseGuards(TokenGuard, RoleGuard)
export class passportUsersController {
    constructor(
        private readonly passportUsersService: PassportUsersService,
        private readonly passportSettingsService: PassportSettingsService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {
    }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateCovidPassportInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN].includes(req.tokenUser?.role_id)) {
                let where = `passportUsers.org_id = ${postData?.org_id} AND passportUsers.status != 2 AND user.status != 2`;
                if (postData?.approval_status != undefined || postData?.approval_status != null) {
                    where += ` AND passportUsers.approval_status = ${postData?.approval_status}`;
                }
                if (postData?.created_by) {
                    where += ` AND passportUsers.created_by = ${postData?.created_by}`;
                }
                if (postData?.submitted_date && postData?.submitted_date != '') {
                    let submitted_date = this.commonDateService.DateTimeFormat(postData?.submitted_date, 'YYYY-MM-DD',);
                    where += ` AND passportUsers.created >= '${submitted_date} 00:00:00' AND passportUsers.created <= '${submitted_date} 23:59:59'`;
                }
                if (postData?.search_str) {
                    where += this.commonService.generateDynamicSearchQuery(postData?.search_str ?? '', ['full_name', 'user.code', 'passportUsers.id', 'passportUsers.title'], false);
                }
                const resultedData = await this.passportUsersService.paginateList(
                    where,
                    postData,
                );
                resultedData['list'] = <any>(
                    await this.commonArrayService.formatToDto(CovidPassportUserDto, resultedData['list'], req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)) {
                const where = { id: postData?.id };
                if(postData?.org_id){
                    where['org_id'] = postData?.org_id;
                }
                let biometricDetails = await this.passportUsersService.findOne(where);
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
                    await this.commonArrayService.formatToDto(CovidPassportUserDto, biometricDetails, req.lang)
                );
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: biometricDetails,
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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
        FileInterceptor("attachment", {
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.COVID_ASSETS_TEMP_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCovidPassportUserInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.org_id) {
                if (file && file.filename && file.fieldname === 'attachment') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)) {
                let userWhere = `passportUsers.status = 1 AND passportUsers.created_by = ${postData?.created_by} AND passportUsers.org_id = ${postData?.org_id}`;
                let userCount = await this.passportUsersService.getRecordCount(userWhere);
                userCount = (Number(userCount.approve) + Number(userCount.pending));
                let customname = await this.translatorService.frontendReadTranslation(req.lang, 'You are already filled covid passport', `/LC_MESSAGES/Trackers/CovidPassport`, `static`);
                if (Number(userCount.approve) == 2) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, customname));
                }
                if (userCount >= 2) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, customname));
                }
                const savedData = await this.passportUsersService.save(postData);
                if (file && file.fieldname === 'attachment' && file.filename) {
                    file.originalname = this.commonFileService.formatFileName(file.originalname);
                    let filename = `covpass/${postData?.org_id}/${req.tokenUser?.id}/${this.commonService.generateMD5(savedData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                    await this.passportUsersService.update({ id: savedData['id'] }, { attachment: filename });
                }
                /* Auto Approval */
                let passportSettings = await this.passportSettingsService.findOne({ org_id: postData?.org_id, status: Not(2) });
                if (passportSettings?.approval_status == 0) {
                    await this.passportUsersService.update({ id: savedData['id'] }, { approval_status: 1 });
                }
                /* Auto Approval */
                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: null,
                    message: await this.translatorService.frontendReadTranslation(req.lang, 'Form has been submitted successfully', `/LC_MESSAGES/Trackers/CovidPassport`, `static`),
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
        } catch (error) {
            if (file && file.filename && file.fieldname === 'attachment') {
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            const recordDetails = await this.passportUsersService.findOne(where);
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
            await this.passportUsersService.update(where, { status: 2 });
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.COVID.COVID_PASSPORT_USER, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "FORM_DELETED"),
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
        FileInterceptor("attachment", {
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.COVID_ASSETS_TEMP_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCovidPassportUserInput, @UploadedFile() file: Express.Multer.File) {
        try {
            if (!postData?.id || !postData?.org_id) {
                if (file && file.filename && file.fieldname === 'attachment') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.ORGADMIN, appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)) {
                const where = { id: postData?.id };
                const recordDetails = await this.passportUsersService.findOne(where);
                if (!recordDetails) {
                    await this.passportUsersService.save({
                        ...postData,
                    });
                }
                if (file && file.fieldname === 'attachment' && file.filename) {
                    file.originalname = this.commonFileService.formatFileName(file.originalname);
                    let filename = `covpass/${postData?.org_id}/${req.tokenUser?.id}/${this.commonService.generateMD5(postData['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                    await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                    postData.attachment = filename;
                }
                await this.passportUsersService.update(where, postData);
                this.activityLogService.create(recordDetails, postData, tableConstant.COVID.COVID_PASSPORT_USER, req.tokenUser?.id);
                let message = await this.translatorService.frontendReadTranslation(req.lang, "FORM_UPDATED");
                if(postData?.approval_status == 2){  
                    message = await this.translatorService.frontendReadTranslation(req.lang, "FORM_REJECTED");                  
                } else if(postData?.approval_status == 1){
                    message = await this.translatorService.frontendReadTranslation(req.lang, "FORM_APPROVED");
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: message,
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
        } catch (error) {
            if (file && file.filename && file.fieldname === 'attachment') {
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
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            postData.created_by = postData?.created_by ?? req.tokenUser?.id;
            if (!postData?.org_id && !postData?.created_by) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if ([appConstant.ROLE.REGISTERED, appConstant.ROLE.SPOUSE].includes(req.tokenUser?.role_id)) {
                let where = `passportUsers.status IN (0,1) AND passportUsers.created_by = ${postData?.created_by} AND passportUsers.org_id = ${postData?.org_id}`;
                let resultedData = await this.passportUsersService.listRecord(where);
                resultedData = <any>(
                    await this.commonArrayService.formatToDto(CovidPassportUserDto, resultedData, req.lang)
                );
                let userWhere = `passportUsers.status = 1 AND passportUsers.created_by = ${postData?.created_by} AND passportUsers.org_id = ${postData?.org_id}`;
                let userCount = await this.passportUsersService.getRecordCount(userWhere);
                userCount = (Number(userCount.approve) + Number(userCount.pending));
                let button_show_hide = 0;
                if (userCount < 2) {
                    button_show_hide = 1;
                }
                let covid_passport_setting = await this.passportSettingsService.findOne({org_id: postData?.org_id, status: Not(2)});
                if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN) {
                    if (covid_passport_setting?.description) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `settings_description_${covid_passport_setting?.org_id}`, `/LC_MESSAGES/Trackers/CovidPassport/${covid_passport_setting?.org_id}`, `dynamic`);
                        if (customName != `settings_description_${covid_passport_setting?.org_id}`) {
                            covid_passport_setting.description = customName;
                        }
                    }
                }
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: { covid_passport_setting, upload_button_show: button_show_hide, data: resultedData.length > 0 ? resultedData : null },
                    message: 'success',
                });
            } else {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
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