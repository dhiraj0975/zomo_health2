import {
    appConstant,
    BioHealthRequestDto,
    BiometricHealthRequestEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService, CommonService,
    SortDirection,
    Status,
    tableConstant
} from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from "express";
import * as md5 from 'md5';
import * as path from 'path';
import { In, Not } from 'typeorm';
import { RoleGuard, TokenGuard } from '../../../guard';
import { ActivityLogService } from '../../master/activitylog/activitylog.service';


import { PaginateInput } from "@/input";
import { RateLimiterMiddleware } from "@/middleware/rate-limiter.middleware";
import { CompanyService } from "@/modules/company/companies/company.service";
import { BiometricsService } from "@/modules/healthcheckup/biometrics/biometrics.service";
import { fileFilter, fileName } from "@/utils/image-upload.utils";
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { TranslationService } from "../../translation/translation.service";
import { UserService } from "../../user/user/user.service";
import { BiometricHealthRequestService } from "./biometric-health-request.service";
import { healthUploadInput, MappingHealthRequestInput, RequestDeleteInput } from "./inputs";

const S3_URL =  process.env.S3_URL_PROD
@Controller('health-checkup/health-request')
@UseGuards(TokenGuard, RoleGuard)
export class BiometricHealthRequestController {
    constructor(
        private readonly biometricHealthRequestService: BiometricHealthRequestService,
        private readonly activityLogService: ActivityLogService,
        private readonly translatorService: TranslationService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly userService: UserService,
        private readonly companyService: CompanyService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private commonService: CommonService,
        private readonly biometricsService: BiometricsService,
    ) {}

    @Post('health-upload')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.HEALTH_REQUEST_PATH}`,
                filename: fileName,
            }),
            fileFilter: fileFilter,
        }))
    async healthUpload(@Req() req: Request, @Res() res: Response, @Body() postData: healthUploadInput, @UploadedFile() file: Express.Multer.File) {
        const rateLimiter = new RateLimiterMiddleware();
        await rateLimiter.use(req, res, async () => {
            try {
                if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
                }
                if (!file) {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING")
                    });
                }
                file = Object.create(file);
                postData = Object.create(postData);
                if (!file || (file && file.fieldname != 'file')) {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REQUIRED_PARAM_MISSING')
                    });
                }
                let filePath: string = '';
                let excelData: any = {status: 0,message: await this.translatorService.frontendReadTranslation(req.lang, 'UNKNOWN_ERROR', `/LC_MESSAGES/Common/Common`, `static`)};
                let fileExt: string = file.originalname.split(".").pop();
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
                postData.org_sheet_header = JSON.stringify(jsonData[0]);
                let requestData = {
                    original_file: file.filename,
                    org_sheet_header: postData.org_sheet_header,
                    status: Status.Zero,
                    mail_status: postData.mail_status === 1 ? Status.One : Status.Zero,
                    request_date: await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss'),
                    hash: '',
                }
                let createdRequest: BiometricHealthRequestEntity = await this.biometricHealthRequestService.create(requestData);
                if(createdRequest){
                    let hash = md5(createdRequest['id']);
                    if (file && file.fieldname === 'file' && file.filename) {
                        file.originalname = this.commonFileService.formatFileName(file.originalname);
                        file.filename = this.commonFileService.generateFileName('health-upload-files', createdRequest['id'].toString(), '', file.originalname.split('.')[file.originalname.split('.').length - 1]);
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename, userBucket: 'private'}));
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(filePath),  filename: file.filename.replace(/\.[^/.]+$/, '.json'),userBucket: 'private'}));
                        await this.biometricHealthRequestService.updateRecord({ id: createdRequest['id'] },{ original_file: file.filename,hash: hash });
                    }
                    let resultedData = {id: hash}
                    return res.status(HttpStatus.CREATED).json({
                        statusCode: 201,
                        success: 1,
                        error: 0,
                        data: resultedData,
                        message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_HEALTH_REQUEST_UPLOADED"),
                    });
                }
            } catch (error) {
                this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
                return res.status(HttpStatus.BAD_REQUEST).json({
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    data: null,
                    message: error?.message,
                });
            }
        });
    }
    @Post('mapping-data')
    async mappingData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingHealthRequestInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let headerData: any = appConstant.BIOMETRIC_HEALTH_REQUEST_HEADER_DATA;
            const where = { hash: postData?.id, status: Not(Status.Two) };
            let recordDetails: any = await this.biometricHealthRequestService.getOne(where,['id','org_sheet_header','mapped_header','status']);
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
            let dragZone: string[] = JSON.parse(recordDetails?.org_sheet_header);
            type KeyValueObject = {[index: string]: string};
            const sanitizeString = (input: string) => input.replace(/\xEFBF/g, "").replace(/ /g, "").replace(/\*/g, "").toLowerCase();
            const mapAutoMapped = async (tempMap, dragZone, autoMapped) => {
                for (const [zoneIndex, zoneValue] of Object.entries(tempMap)) {
                    const zoneSanitized = sanitizeString(zoneValue.toString());
                    let matchIndex = '';
                    for (let dragIndex: number = 0; dragIndex < dragZone.length; dragIndex++) {
                        const dragSanitized = sanitizeString(dragZone[dragIndex]);
                        if (zoneSanitized === dragSanitized) {
                            matchIndex = dragIndex.toString();
                            break;
                        }
                    }
                    autoMapped[zoneIndex] = matchIndex || '';
                }
            };

            let autoMapped: KeyValueObject = {};
            if(!recordDetails['mapped_header']) {
                await mapAutoMapped({...headerData}, dragZone, autoMapped);
            } else {
                autoMapped = JSON.parse(recordDetails['mapped_header']);
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {id: postData?.id,status: recordDetails['status'],drop_zone:headerData,auto_mapped:autoMapped,drag_zone:dragZone},
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
    @Post('save-mapping-data')
    async saveMappingData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingHealthRequestInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id || !postData?.mapped_header) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { hash: postData?.id };
            const recordDetails: BiometricHealthRequestEntity | null = await this.biometricHealthRequestService.getOne(where,['id','org_sheet_header','mapped_header','status']);
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
            await this.biometricHealthRequestService.updateRecord(where, { mapped_header: postData.mapped_header, status: Status.Three });
            this.activityLogService.create(recordDetails, {mapped_header: postData.mapped_header, status: Status.Three}, tableConstant.CHALLENGE.TBL_CH_WEIGHT_REQUEST, req.tokenUser?.id,'update');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {status: 'show_mapping_data', id: postData?.id},
                message: await this.translatorService.frontendReadTranslation(req.lang, "MAPPING_DATA_DONE"),
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
    @Post('show-mapping-data')
    async showMappingData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingHealthRequestInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let message: string = '';
            const recordDetails: BiometricHealthRequestEntity | null = await this.biometricHealthRequestService.getOne({hash: postData?.id,status: Status.Three},['mapped_header','original_file','org_sheet_header']);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            }
            let mappedHeader = JSON.parse(recordDetails['mapped_header']);
            let orgSheetHeader = JSON.parse(recordDetails['org_sheet_header']);
            let headerData: any = appConstant.BIOMETRIC_HEALTH_REQUEST_HEADER_DATA;
            let headerDataArray: string[] = Object.values(headerData)
            const selectedMappedHeader: any = Object.fromEntries(
                Object.entries(mappedHeader).filter(([key, value]) => value !== "")
            );
            let activityKey = Object.keys(appConstant.BIOMETRIC_HEALTH_REQUEST_DROP_DATA);
            const defaultHeader = {};
            const keys = Object.keys(headerData);
            let mappedActivityCount: number = 0
            for (let i: number = 0; i < keys.length; i++) {
                const key = keys[i];
                if (selectedMappedHeader[key] !== undefined) {
                    defaultHeader[selectedMappedHeader[key]] = orgSheetHeader[selectedMappedHeader[key]];
                } else {
                    if (activityKey.includes(key)) {
                        mappedActivityCount++
                    }
                }
            }
            if (activityKey.length == mappedActivityCount) {
                message = await this.translatorService.frontendReadTranslation(req.lang, "ERR_HEALTH_REQUEST_MAPPED")
            }
            let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `${recordDetails['original_file'].replace(/\.[^/.]+$/, '.json')}`, userBucket: 'private'}));
            let sheetData: any = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
            sheetData = sheetData.slice(1);
            let sheetDataCount = sheetData.length
            if (!sheetDataCount) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_DATA_NOT_FOUND"));
            }
            let resultedData = [];
            let activityCount: number = 0;
            const maxPreviewRows: number = 5;
            for (let i: number = 0; i < sheetDataCount; i++) {
                const row: Record<string, any> = {};
                for (const key in defaultHeader) {
                    const fieldName = headerData[keys[key]];
                    let cellValue = sheetData[i]?.[key];
                    const value = cellValue || (headerDataArray.includes(fieldName) ? '-' : 'N/A');
                    row[key] = value;
                    if (value === 'N/A') {
                        activityCount++;
                    }
                }
                if (i < maxPreviewRows) {
                    resultedData.push(row);
                }
                if (i == maxPreviewRows - 1) {
                    break;
                }
            }
            let totalActivity: number = activityKey.length / 2;
            if ((sheetDataCount * totalActivity) == activityCount) {
                message = await this.translatorService.frontendReadTranslation(req.lang, "ERR_ADD_AT_LEAST_ONE_HEALTH")
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {id: postData?.id,tabledata: resultedData, defaultHeader: defaultHeader, count: sheetDataCount, message: message},
                message: 'Success',
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
    @Post('undo-request-data')
    async undoRequestData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingHealthRequestInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails:BiometricHealthRequestEntity | null = await this.biometricHealthRequestService.getOne({hash: postData?.id},['original_file','success_file','rejected_file','status']);
            if (!recordDetails?.success_file) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            }
            let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `${recordDetails['success_file'].replace(/\.[^/.]+$/, '.json')}`, userBucket: 'private'}));
            let JsonData: any = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
            if (!JsonData.length) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_DATA_NOT_FOUND"));
            }

            const idArray = [];
            for (let i: number = 0; i < JsonData.length; i++) {
                idArray.push(JsonData[i].id);
            }
            await this.biometricsService.updateRecord({id: In(idArray)},{status: 2});
            let biometricHealthRequestRevert = {status: Status.Zero,success_file: null,rejected_file: null}
            await this.biometricHealthRequestService.updateRecord({hash: postData?.id},biometricHealthRequestRevert);
            this.activityLogService.create(recordDetails, biometricHealthRequestRevert, tableConstant.HEALTH_CHECKUP.TBL_HC_BIOMETRIC_HEALTH_REQUEST, req.tokenUser?.id,'update');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_UNDO_HEALTH_REQUEST"),
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
    @Post('import-cancel')
    async importCancel(@Req() req: Request, @Res() res: Response, @Body() postData: MappingHealthRequestInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails: BiometricHealthRequestEntity = await this.biometricHealthRequestService.getOne({hash: postData?.id},['mapped_header','original_file','status']);
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
            await this.biometricHealthRequestService.updateRecord({hash: postData?.id}, { status: Status.Four });
            this.activityLogService.create(recordDetails, { status: Status.Four }, tableConstant.CHALLENGE.TBL_CH_WEIGHT_REQUEST, req.tokenUser?.id,'update');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "IMPORT_CANCEL"),
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
    @Post('request-paginate')
    async requestPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            postData = this.commonService.sanitizePayload(postData);
            let user =  req.tokenUser;
            const order: SortDirection = (postData && postData?.order ? postData?.order : 'DESC' ) as SortDirection;
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let where = `status != '${Status.Two}'`;
            if ([0,1,3,4,5].includes(postData?.status)) {
                where += ` AND status = ${postData?.status}`;
            }
            if (postData?.date) {
                where += ` AND created LIKE '%${await this.commonDateService.DateTimeFormat(new Date(postData?.date), 'YYYY-MM-DD')}%'`;
            }
            if (postData?.search_str) {
                where += ` AND (id LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.biometricHealthRequestService.commonQueryBuilder([],
                where,
                { [`biometricHealthRequest.${orderBy}`] : order},[],'getManyAndCount',postData
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(BioHealthRequestDto, resultedData['list'], req.lang)
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
    @Post('request-delete')
    async requestDelete(@Req() req: Request, @Res() res: Response, @Body() postData: RequestDeleteInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            let user =  req.tokenUser;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, status: Not(Status.Two) };
            let requestDetails: BiometricHealthRequestEntity | null = await this.biometricHealthRequestService.getOne(where);
            if (!requestDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.biometricHealthRequestService.updateRecord(
                { id: postData?.id, status: Not(Status.Two) },
                { status: Status.Two },
            );
            this.activityLogService.create(requestDetails, { status: Status.Two }, tableConstant.CHALLENGE.TBL_CH_WEIGHT_REQUEST, req.tokenUser?.id,'update');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_HEALTH_REQUEST_DELETED', `/LC_MESSAGES/Common/Common`,`static`)+'.',
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