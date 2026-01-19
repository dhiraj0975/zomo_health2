import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, ImportUserRequestDto } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import * as moment from 'moment-timezone';
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { v4 as uuidv4 } from 'uuid';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateImportRequestDataInput, PaginateWithCompanyInput } from '../../../input';
import { RateLimiterMiddleware } from '../../../middleware/rate-limiter.middleware';
import { datafileFilter, fileName } from "../../../utils/image-upload.utils";
import { TranslationService } from '../../translation/translation.service';
import { ImportRequestDataService } from "./importrequestdata.service";
let S3_URL = process.env.S3_URL_PROD;
S3_URL = S3_URL.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD);
const path = require('path');
@Controller('health-checkup/import-request-data')
@UseGuards(TokenGuard, RoleGuard)
export class ImportRequestDataController {
    constructor(
        private readonly importRequestDataService: ImportRequestDataService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE') private commonMicroservice: ClientProxy,
    ) { }
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = ``;
            postData?.hasOwnProperty('status') ? (where = `importUser.status = ${postData?.status}`) : (where = `importUser.status != 0`);
            if (postData?.org_id) {
                where += ` AND importUser.org_id = ${postData?.org_id}`
            }
            if (postData?.request_date) {
                let startDate = moment(postData?.request_date).startOf('day').format('YYYY-MM-DD HH:mm:ss');
                let endDate = moment(postData?.request_date).endOf('day').format('YYYY-MM-DD HH:mm:ss');
                where += ` AND(importUser.request_date >= '${startDate}' and importUser.request_date <= '${endDate}')`
            }
            if (postData?.search_str) {
                where += ` AND (importUser.email LIKE '%${postData?.search_str}%' OR importUser.origional_file LIKE '%${postData?.search_str}%' OR importUser.created_file LIKE '%${postData?.search_str}%' OR importUser.updated_file LIKE '%${postData?.search_str}%' OR importUser.rejected_file LIKE '%${postData?.search_str}%' OR importUser.file_error LIKE '%${postData?.search_str}%' OR company.company_name LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.importRequestDataService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(ImportUserRequestDto, resultedData['list'], req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = postData?.id ? postData?.user_id ? { id: postData?.id, user_id: postData?.user_id } : { id: postData?.id } : { user_id: postData?.user_id };
            this.commonFileService.addMembershipCodeCondition(req, where)
            let recordDetails = await this.importRequestDataService.findOne(where);
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
                await this.commonArrayService.formatToDto(ImportUserRequestDto, recordDetails, req.lang)
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
    @Post('import-users')
    @UseInterceptors(
        FileInterceptor('importusers_file', {
            storage: diskStorage({
                destination: `${appConstant.HEALTH_CHECKUP_IMAGE_PATH}healthdata/UploadsImportFile/`,
                filename: fileName,
            }),
            fileFilter: datafileFilter,
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateImportRequestDataInput, @UploadedFile() file: Express.Multer.File) {
        const rateLimiter = new RateLimiterMiddleware();
        await rateLimiter.use(req, res, async () => {
            try {
                if ([appConstant.ROLE.ADMIN,appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER].includes(req.tokenUser?.role_id)) {
                    if (!file || (file && file.fieldname != 'importusers_file')) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING'));
                    }
                    let fileExt: string = file.originalname.split(".").pop();
                    let updateData = {},filePath: string = '';
                    let currentDate = this.commonDateService.getTodayDate().format('MM-DD-YYYY');
                    const randname = uuidv4();
                    let excelData: any = {status: 0,message: await this.translatorService.frontendReadTranslation(req.lang, 'UNKNOWN_ERROR', `/LC_MESSAGES/Common/Common`, `static`)};
                    if (fileExt == 'csv') {
                        excelData = await this.commonFileService.createFileToJson(file.path,'csv_to_json.py',req);
                        filePath = file.path.replace(".csv",".json");
                    } else {
                        excelData = await this.commonFileService.createFileToJson(file.path,'excel_to_json.py',req);
                        filePath = file.path.replace(".xlsx",".json");
                    }
                    if (excelData?.status === 0) {
                        return res.status(HttpStatus.BAD_REQUEST).json({
                            success: 0,
                            error: 1,
                            data: null,
                            message: excelData?.message
                        });
                    }
                    let jsonData = await this.commonFileService.readFile(filePath);
                    if (Array.isArray(jsonData) && jsonData?.length <= 1) {
                        return res.status(HttpStatus.BAD_REQUEST).json({
                            success: 0,
                            error: 1,
                            data: null,
                            message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_DATA_NOT_FOUND")
                        });
                    }

                    if (file && file.filename && file.fieldname === 'importusers_file') {
                        const filename = `healthdata/UploadsImportFile/${currentDate}users${randname}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                        let upload_file = await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(file.path), filename: filename, userBucket: 'private' }));
                        updateData['origional_file'] = filename;
                        updateData['user_notify'] = postData?.user_notify ?? 0;
                        await this.importRequestDataService.save(updateData);
                    }
                    if (file && file.filename && file.fieldname === 'importusers_file') {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: 'success',
                    });
                } else {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
                }
            } catch (error) {
                if (file && file.filename && file.fieldname === 'origional_file') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
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
        });
    }
}
