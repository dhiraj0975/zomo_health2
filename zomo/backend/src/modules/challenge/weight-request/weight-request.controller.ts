import {
    appConstant,
    ChallengeEntity,
    CommonArrayService,
    CommonDateService,
    CommonFileService, CommonService,
    CompaniesEntity,
    Status,
    tableConstant,
    UserEntity, WeightRequestDto, WeightRequestEntity, SortDirection,
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
import {Request, Response} from "express";
import * as path from 'path';
import {ActivityLogService} from '../../master/activitylog/activitylog.service';
import {In, Not} from 'typeorm';
import {RoleGuard, TokenGuard} from '../../../guard';
import * as md5 from 'md5';


import {WeightRequestService} from "@/modules/challenge/weight-request/weight-request.service";
import {TranslationService} from "../../translation/translation.service";
import {ChallengeService} from "../challenge/challenge.service";
import {ScheduleChallengeService} from "@/modules/challenge/schedulechallenge/schedulechallenge.service";
import {UserService} from "../../user/user/user.service";
import {DownloadTempleteInput, MappingWeightRequestInput, RequestDeleteInput, weightUploadInput} from "./inputs";
import {CompanyService} from "@/modules/company/companies/company.service";
import {FileInterceptor} from "@nestjs/platform-express";
import {diskStorage} from "multer";
import {fileFilter, fileName} from "@/utils/image-upload.utils";
import {RateLimiterMiddleware} from "@/middleware/rate-limiter.middleware";
import {lastValueFrom} from "rxjs";
import {ClientProxy} from "@nestjs/microservices";
import {PaginateInput} from "@/input";
import {BioWeightService} from "@/modules/challenge/bioweight/bioweight.service";

const S3_URL =  process.env.S3_URL_PROD
@Controller('challenge/weight-request')
@UseGuards(TokenGuard, RoleGuard)
export class WeightRequestController {
    constructor(
        private readonly weightRequestService: WeightRequestService,
        private readonly activityLogService: ActivityLogService,
        private readonly translatorService: TranslationService,
        private readonly challengeService: ChallengeService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly userService: UserService,
        private readonly companyService: CompanyService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private commonService: CommonService,
        private bioWeightService: BioWeightService,
    ) {}

    @Post('org-list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }

            let challengeId: ChallengeEntity | null = await this.challengeService.getOne({bio_challenge_type: 'Weight_progress'},['id'],{id: 'ASC'})
            let resultedData = await this.scheduleChallengeService.commonQueryBuilder(
                ['company.id AS id', 'company.company_name AS company_name'],
                `company.deleted = 0 AND scheduleChallenge.challenge_id = '${challengeId.id}'`,
                {'company.company_name':'ASC'},
                [
                    {
                        join_table: 'scheduleChallenge.company',
                        alias: 'company',
                        table: tableConstant.COMPANIES.TBL_COMPANY,
                        on_condition: `scheduleChallenge.org_id = company.id`,
                        join_type: 'inner_one',
                    }
                ],
                'getRawMany',
                {},
                'scheduleChallenge.org_id'
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

    @Post('download-template')
    async downloadTemplate(@Req() req: Request, @Res() res: Response, @Body() postData: DownloadTempleteInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }

            let userData: UserEntity[] = await this.userService.getAll({status:1,role_id: In([2,16]),org_id: postData.org_id},['code','username', 'membership_code', 'first_name', 'middle_name', 'last_name', 'securitycode', 'employeeid', 'gender', 'dob', 'email'])

            let headerData: string[] = appConstant.WEIGHT_REQUEST_DATA;
            const [PROP_0,PROP_1,PROP_2,PROP_3,PROP_4,PROP_5,PROP_6,PROP_7,PROP_8,PROP_9,PROP_10]: string[] = headerData;

            let jsonData = new Array(userData.length);
            let getCompany: CompaniesEntity | null = await this.companyService.getOne({id: postData.org_id},['company_name'])
            let companyName = getCompany.company_name;
            if(userData.length > 0){
                for (let i: number = 0; i < userData.length; i++) {
                    let user: UserEntity = userData[i];
                    let userDataRow = {
                        [PROP_0] : user?.['code'],
                        [PROP_1] : user?.['membership_code'],
                        [PROP_2] : user?.['username'],
                        [PROP_3] : user?.['first_name'],
                        [PROP_4] : user?.['middle_name'],
                        [PROP_5] : user?.['last_name'],
                        [PROP_6] : '',
                        [PROP_7] : user?.['employeeid'],
                        [PROP_8] : user?.['gender'],
                        [PROP_9] : await this.commonDateService.DateTimeFormat(user?.dob, 'MM-DD-YYYY') || '',
                        [PROP_10] : user?.['email'],
                        'Weight' : '',
                        'Added Date' : '',
                    }
                    jsonData[i] = userDataRow;
                }

                const jsonString = JSON.stringify(jsonData, null, 2);
                let fileName:string = `${companyName.replace(/\s/g, "_")}.json`;
                let filePath:string = path.join(`${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`);
                await this.commonFileService.dirIsExist(`${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`);
                let data;
                try {
                    let writeFile = await this.commonFileService.writeFile(filePath, jsonString, fileName);
                    if (writeFile?.status == 'success') {
                        let excelData: any = await this.commonFileService.createJsonToFile(1, `${filePath}/${fileName}`, 'pythonjsontocsv.py');
                        if (excelData?.status == 'success') {
                            filePath = `${filePath}/${fileName}`.replace(".json",".csv");
                            if (await this.commonFileService.fileExist(filePath)) {
                                data = await this.commonFileService.FileToBase64(filePath);
                            } else {
                                throw new Error(`File does not exist`);
                            }
                        }
                    } else {
                        throw new Error(`File does not exist`);
                    }
                } catch(err) {
                    throw new Error(`An error occurred: ${err}`);
                }
                fileName = fileName.replace(".json","");
                await this.commonFileService.removeFileFromLocal(filePath);
                await this.commonFileService.removeFileFromLocal(filePath.replace(".csv",".json"));
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: {excel_data: data,sheet_name: fileName, extension: 'csv'},
                    message: 'success',
                });
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_USER_NOT_FOUND"));
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

    @Post('weight-point-upload')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`,
                filename: fileName,
            }),
            fileFilter: fileFilter,
        }))
    async weightPointUpload(@Req() req: Request, @Res() res: Response, @Body() postData: weightUploadInput, @UploadedFile() file: Express.Multer.File) {
        const rateLimiter = new RateLimiterMiddleware();
        await rateLimiter.use(req, res, async () => {
            try {
                if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
                }
                if (!postData?.org_id) {
                    if (file && file.fieldname === 'file' && file.filename) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
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
                    org_id: Number(postData?.org_id),
                    original_file: file.filename,
                    org_sheet_header: postData.org_sheet_header,
                    status: Status.Zero,
                    mail_status: postData.mail_status === 1 ? Status.One : Status.Zero,
                    created_by: req.tokenUser?.id,
                    updated_by: req.tokenUser?.id,
                    request_date: await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss'),
                }
                let createdRequest: WeightRequestEntity = await this.weightRequestService.create(requestData);
                if(createdRequest){
                    let hash = md5(createdRequest['id']);
                    if (file && file.fieldname === 'file' && file.filename) {
                        file.originalname = this.commonFileService.formatFileName(file.originalname);
                        file.filename = this.commonFileService.generateFileName('weight-upload-files', createdRequest['id'].toString(), '', file.originalname.split('.')[file.originalname.split('.').length - 1]);
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename, userBucket: 'private'}));
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(filePath),  filename: file.filename.replace(/\.[^/.]+$/, '.json'),userBucket: 'private'}));
                        await this.weightRequestService.updateRecord({ id: createdRequest['id'] },{ original_file: file.filename,hash: hash });
                    }
                    let resultedData = {id: hash}
                    return res.status(HttpStatus.CREATED).json({
                        statusCode: 201,
                        success: 1,
                        error: 0,
                        data: resultedData,
                        message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_CUSTOM_POINT_UPLOADED"),
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
    async mappingData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingWeightRequestInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let pointHeaderData: any = appConstant.WEIGHT_REQUEST_HEADER_DATA;
            let pointHeaderDataArray: string[] = Object.values(pointHeaderData)
            const where = { hash: postData?.id, org_id: postData?.org_id, created_by: req.tokenUser.id, status: Not(Status.Two) };
            let recordDetails: any = await this.weightRequestService.getOne(where,['id','org_id','org_sheet_header','mapped_header','status']);
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
            let dropZoneActivity: any = {'Weight': {'L': 'Weight','M': 'Added Date'}};

            if(!recordDetails['mapped_header']) {
                await mapAutoMapped({...pointHeaderData,...{'L': 'Weight','M': 'Added Date'}}, dragZone, autoMapped);
            } else {
                autoMapped = JSON.parse(recordDetails['mapped_header']);
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {id: postData?.id,status: recordDetails['status'],drop_zone:pointHeaderData,auto_mapped:autoMapped,drag_zone:dragZone,drop_zone_activity: dropZoneActivity},
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
    async saveMappingData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingWeightRequestInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id || !postData?.mapped_header) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { hash: postData?.id };
            const recordDetails: WeightRequestEntity | null = await this.weightRequestService.getOne(where,['id','org_id','org_sheet_header','mapped_header','status']);
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
            await this.weightRequestService.updateRecord(where, { mapped_header: postData.mapped_header, status: Status.Three });
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
    async showMappingData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingWeightRequestInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let message: string = '';
            const recordDetails: WeightRequestEntity | null = await this.weightRequestService.getOne({hash: postData?.id,status: Status.Three},['org_id','mapped_header','original_file','org_sheet_header']);
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
            let pointHeaderData: any = appConstant.WEIGHT_REQUEST_HEADER_DATA;
            let pointHeaderDataArray: string[] = Object.values(pointHeaderData)
            const selectedMappedHeader: any = Object.fromEntries(
                Object.entries(mappedHeader).filter(([key, value]) => value !== "")
            );
            let dropZoneActivity: any = {'L': 'Weight','M': 'Added Date_Date'};
            let headerData = {...pointHeaderData, ...dropZoneActivity}
            let activityKey = Object.keys(dropZoneActivity);
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
                message = await this.translatorService.frontendReadTranslation(req.lang, "ERR_CUSTOM_POINT_MAPPED")
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
                    if (fieldName.toLowerCase().includes('_date')) {
                        const monthName = await this.commonDateService.DateTimeFormat(cellValue, 'MMMM');
                        const translatedMonth = await this.translatorService.frontendReadTranslation(req.lang, monthName.toString(), `/LC_MESSAGES/Common/Month`, `static`);
                        cellValue = `${translatedMonth.toString().substring(0, 3)} ${await this.commonDateService.DateTimeFormat(cellValue, 'D, YYYY')}`;
                    }
                    const value = cellValue || (pointHeaderDataArray.includes(fieldName) ? '-' : 'N/A');
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
                message = await this.translatorService.frontendReadTranslation(req.lang, "ERR_ADD_AT_LEAST_ONE_POINT")
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
    async undoRequestData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingWeightRequestInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails:WeightRequestEntity | null = await this.weightRequestService.getOne({hash: postData?.id},['original_file','success_file','rejected_file','status']);
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
            await this.bioWeightService.updateRecord({id: In(idArray)},{status: 2});
            let weightRequestRevert = {status: Status.Zero,success_file: null,rejected_file: null}
            await this.weightRequestService.updateRecord({hash: postData?.id},weightRequestRevert);
            this.activityLogService.create(recordDetails, weightRequestRevert, tableConstant.CHALLENGE.TBL_CH_WEIGHT_REQUEST, req.tokenUser?.id,'update');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "MSG_UNDO_CUSTOM_POINT"),
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
    async importCancel(@Req() req: Request, @Res() res: Response, @Body() postData: MappingWeightRequestInput) {
        try {
            if(req.tokenUser?.role_id != appConstant.ROLE.ADMIN){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_ACCESS_DENIED"));
            }
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails: WeightRequestEntity = await this.weightRequestService.getOne({hash: postData?.id},['org_id','mapped_header','original_file','status']);
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
            await this.weightRequestService.updateRecord({hash: postData?.id}, { status: Status.Four });
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
            where += ` AND created_by IN (${user?.id}) AND org_id = '${postData?.org_id}'`;
            const resultedData = await this.weightRequestService.commonQueryBuilder([],
                where,
                { [`weightRequest.${orderBy}`] : order},[],'getManyAndCount',postData
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(WeightRequestDto, resultedData['list'], req.lang)
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
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, org_id: postData?.org_id, created_by: req.tokenUser.id, status: Not(Status.Two) };
            let requestDetails: WeightRequestEntity | null = await this.weightRequestService.getOne(where);
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
            await this.weightRequestService.updateRecord(
                { id: postData?.id, org_id: postData?.org_id, created_by: req.tokenUser.id, status: Not(Status.Two) },
                { status: Status.Two },
            );
            this.activityLogService.create(requestDetails, { status: Status.Two }, tableConstant.CHALLENGE.TBL_CH_WEIGHT_REQUEST, req.tokenUser?.id,'update');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'MSG_POINT_DELETED', `/LC_MESSAGES/Common/Common`,`static`)+'.',
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