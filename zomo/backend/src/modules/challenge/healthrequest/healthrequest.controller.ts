import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonService, HealthActivityEntity,
    HealthRequestDto, HealthRequestEntity,
    tableConstant
} from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus, Inject,
    Post,
    Req,
    Res, UploadedFile,
    UseGuards, UseInterceptors
} from '@nestjs/common';
import { ClientProxy } from "@nestjs/microservices";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request, Response } from "express";
import * as md5 from 'md5';
import { diskStorage } from "multer";
import * as path from 'path';
import { lastValueFrom } from "rxjs";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { FindOptionsWhere, In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { RateLimiterMiddleware } from "../../../middleware/rate-limiter.middleware";
import { fileFilter, fileName } from "../../../utils/image-upload.utils";
import { TranslationService } from "../../translation/translation.service";
import { FrontService } from "../front/front.service";
import { HealthUsersActivityService } from "../healthusersactivity/healthusersactivity.service";
import { HealthRequestService } from './healthrequest.service';
import {
    DownloadTemplateInput,
    GetOneRequestDataInput,
    importCancelInput,
    mappingDataInput,
    MilesPointUploadInput,
    PaginationRequestInput,
    requestDeleteInput,
    saveMappingDataInput, showMappingDataInput, undoRequestDataInput
} from "./inputs";
@Controller('challenge/health-request')
@UseGuards(TokenGuard, RoleGuard)
export class HealthRequestController {
    constructor(
        private readonly healthRequestService: HealthRequestService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly frontService: FrontService,
        private readonly healthUsersActivityService: HealthUsersActivityService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginationRequestInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user =  req.tokenUser;
            let org_id: number = user.org_id;
            if(postData?.org_id){
                org_id = postData?.org_id;
            }
            let where: string = ` hr.status != 2`;
            if(user.role_id == 22 || user.role_id == 7 || user.role_id == 23){
                let checkExist;
                if(user.role_id == 7){
                    checkExist = await this.frontService.brokerExists({org_id: org_id,user_id: user.id,is_global: '1'});
                }else if(user.role_id == 23){
                    checkExist = await this.frontService.brokerExists({org_id: org_id,user_id: user.id,is_global: '2'});
                }else if(user.role_id == 22){
                    checkExist = await this.frontService.brokerExists({org_id: org_id,broker_admin_id: user.id});
                }
                if (!checkExist) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_FORBIDDEN_ACCESS"));
                }
            }
            where += ` AND hr.schedule_id = ${postData?.schedule_id} AND hr.org_id = ${org_id}`;
            if (postData?.status && [0,1,3,4,5].includes(postData?.status)) {
                where += ` AND hr.status = ${postData?.status}`;
            }
            if (postData?.request_date) {
                where += ` AND hr.request_date LIKE '%${await this.commonDateService.DateTimeFormat(postData?.request_date, 'YYYY-MM-DD','YYYY-MM-DD')}%'`;
            }
            if (postData?.search_str) {
                where += ` AND (hr.id LIKE '%${postData?.search_str}%')`;
            }
            const resultedData = await this.healthRequestService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(HealthRequestDto, resultedData['list'], req.lang)
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
    @Post('download-template')
    async downloadTemplate(@Req() req: Request, @Res() res: Response, @Body() postData: DownloadTemplateInput) {
        try {
            if (!postData?.schedule_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user =  req.tokenUser;
            let org_id: number = user.org_id;
            if(postData?.org_id){
                org_id = postData?.org_id;
            }
            let companyCode: string = user?.membership_code
            if(user.role_id == 22 || user.role_id == 7 || user.role_id == 23){
                let checkExist;
                if(user.role_id == 7){
                    checkExist = await this.frontService.brokerExists({org_id: org_id,user_id: user.id,is_global: '1'});
                }else if(user.role_id == 23){
                    checkExist = await this.frontService.brokerExists({org_id: org_id,user_id: user.id,is_global: '2'});
                }else if(user.role_id == 22){
                    checkExist = await this.frontService.brokerExists({org_id: org_id,broker_admin_id: user.id});
                }
                if (!checkExist) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_FORBIDDEN_ACCESS"));
                }

            }

            let headerData: Record<number, string> = appConstant.UPLOAD_POINT_HEADER;
            let activityData: Record<string, string> = {}
            let getActivities: HealthActivityEntity[] = await this.frontService.healthActivityListRecord(['id','name'],{schedule_id: postData?.schedule_id,org_id: postData?.org_id,status: '1'},{'id': "ASC"});
            if(getActivities.length > 0){
                const activitiesLength: number = getActivities.length;
                for (let i: number = 0; i < activitiesLength; i++) {
                    const activity: any = getActivities[i];
                    const name = activity?.name;
                    if (name) {
                        Object.assign(activityData, {
                            [name]: '',
                            [`${name}_Date`]: ''
                        });
                    }
                }
            }
            const joinTableList = [{'join_table': 'user.settings','alias':'settings', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on_condition' : `settings.user_id = user.id`, 'connect' : 'user', 'join_type' : 'left_one' }, {'join_table': 'user.department','alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on_condition' : `department.id = user.department_id` , 'connect' : 'user', 'join_type' : 'left_one' }, {'join_table': 'user.location','alias':'location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on_condition' : `location.id = user.location` , 'connect' : 'user', 'join_type' : 'left_one' }, {'join_table': 'user.company','alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on_condition' : `company.id = user.org_id` , 'connect' : 'user', 'join_type' : 'left_one' },{'join_table': 'user.company_setting','alias':'company_setting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on_condition' : `company_setting.org_id = user.org_id` , 'connect' : 'user', 'join_type' : 'left_one' }];
            let getUsers: any = await this.frontService.userDetailsData(['user.id','user.code','user.username','user.first_name','user.middle_name','user.last_name','user.role_id','user.employeeid','user.dob','user.on_insurance_plan','user.email','settings.jobtitle','settings.wphone','settings.hphone', 'company.company_name','company_setting.spouse_option','department.dept_name','location.location_name','location.address1','location.address2','location.city','location.state','location.country','location.zip'],{membership_code: companyCode,role_id: In([2,16]),status: '1'},{'user.id': 'ASC'},joinTableList,'getMany');
            let jsonData: any[] = [];
            let companyName: string = '';
            if(getUsers.length > 0){
                companyName = getUsers?.[0]?.['company']?.['company_name'];
                for (let users of getUsers){
                    let country = users?.['location']?.['country'] || '';
                    let userDataRow = {
                        [headerData[0]] : users?.['company']?.['company_name'],
                        [headerData[1]] : users?.['id'],
                        [headerData[2]] : users?.['code'],
                        [headerData[3]] : users?.['username'],
                        [headerData[4]] : users?.['department']?.['dept_name'],
                        [headerData[5]] : users?.['first_name'],
                        [headerData[6]] : users?.['middle_name'],
                        [headerData[7]] : users?.['last_name'],
                        [headerData[8]] : (users?.['role_id'] === 2 ? "Register" : users?.['company_setting']['spouse_option'] === 1 ? "Spouse / Domestic Partner" : "Spouse"),
                        [headerData[9]] : users?.['settings']?.['jobtitle'],
                        [headerData[10]] : users?.['employeeid'],
                        [headerData[11]] : await this.commonDateService.DateTimeFormat(users?.['dob'], 'MM-DD-YYYY'),
                        [headerData[12]] : users?.['on_insurance_plan'],
                        [headerData[13]] : users?.['email'],
                        [headerData[14]] : users?.['settings']?.['wphone'],
                        [headerData[15]] : users?.['settings']?.['hphone'],
                        [headerData[16]] : users?.['location']?.['location_name'],
                        [headerData[17]] : users?.['location']?.['address1'],
                        [headerData[18]] : users?.['location']?.['address2'],
                        [headerData[19]] : users?.['location']?.['city'],
                        [headerData[20]] : users?.['location']?.['state'],
                        [headerData[21]] : users?.['location']?.['zip'],
                        [headerData[22]] : country,
                    }
                    userDataRow = { ...userDataRow, ...activityData };
                    jsonData.push(userDataRow)
                }
                const jsonString: string = JSON.stringify(jsonData, null, 2);
                let currentDatetime = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD-HHmmss');
                let fileName:string = `${companyName.replace(/\s/g, "_")}_Point_Upload_Template_${currentDatetime}.json`;
                let filePath:string = path.join(`${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`);
                await this.commonFileService.dirIsExist(`${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`);
                let data;
                try {
                    let writeFile = await this.commonFileService.writeFile(filePath, jsonString, fileName);
                    if (writeFile?.status == 'success') {
                        let excelData: any = await this.commonFileService.createJsonToFile(1, `${filePath}/${fileName}`, 'pythonjsontoxlsx.py');
                        if (excelData?.status == 'success') {
                            filePath = `${filePath}/${fileName}`.replace(".json",".xlsx");
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
                await this.commonFileService.removeFileFromLocal(`${filePath}/${fileName}.json`);
                await this.commonFileService.removeFileFromLocal(`${filePath}/${fileName}.xlsx`);
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: {excel_data: data,sheet_name: fileName, extension: 'xlsx'},
                    message: 'success',
                });
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_USER_NOT_FOUND"));
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
    @Post('miles-point-upload')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.CHALLENGE_USER_UPLOAD_FILE_PATH}`,
                filename: fileName,
            }),
            fileFilter: fileFilter,
        }),
        AccessGuard
    )
    async milesPointUpload(@Req() req: Request, @Res() res: Response, @Body() postData: MilesPointUploadInput, @UploadedFile() file: Express.Multer.File) {
        const rateLimiter = new RateLimiterMiddleware();
        await rateLimiter.use(req, res, async () => {
            try {
                let reqData =  req?.tokenUser;
                postData.org_id = postData?.org_id ?? reqData?.org_id;
                if (!postData?.org_id || !postData?.schedule_id || !file) {
                    if (file && file.fieldname === 'file' && file.filename) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING")
                    });
                }
                file = Object.create(file);
                postData = Object.create(postData);
                if (!file || (file && file.fieldname != 'file')) {
                    return res.status(HttpStatus.BAD_REQUEST).json({
                        success: 0,
                        error: 1,
                        data: null,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, 'ERR_REQUIRED_PARAM_MISSING')
                    });
                }
                let filePath: string = '';
                let excelData: any = {status: 0,message: await this.translatorService.frontendReadTranslation(req?.lang, 'UNKNOWN_ERROR', `/LC_MESSAGES/Common/Common`, `static`)};
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
                        message: await this.translatorService.frontendReadTranslation(req?.lang, "ERR_DATA_NOT_FOUND")
                    });
                }
                postData.org_sheet_header = JSON.stringify(jsonData[0]);
                let requestData = {
                    user_id: Number(reqData?.id),
                    org_id: Number(postData?.org_id),
                    schedule_id: Number(postData?.schedule_id),
                    origional_file: file.filename,
                    org_sheet_header: postData.org_sheet_header,
                    email: reqData?.email,
                    status: 0,
                    created_by: req.tokenUser?.id,
                    updated_by: req.tokenUser?.id,
                    request_date: await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss'),
                }
                let createdRequest = await this.healthRequestService.save({...requestData});
                if(createdRequest){
                    let hash = md5(createdRequest['id']);
                    if (file && file.fieldname === 'file' && file.filename) {
                        file.originalname = this.commonFileService.formatFileName(file.originalname);
                        file.filename = this.commonFileService.generateFileName(`challengeimport/mileimport/${postData?.org_id.toString()}`, postData?.schedule_id.toString(), 'Point_Upload_Template_', file.originalname.split('.')[file.originalname.split('.').length - 1]);
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename, userBucket: 'private'}));
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(filePath),  filename: file.filename.replace(/\.[^/.]+$/, '.json'),userBucket: 'private'}));
                        await this.healthRequestService.update({ id: createdRequest['id'] },{ origional_file: file.filename,hash: hash });
                    }
                    let resultedData = {hash: hash}
                    return res.status(HttpStatus.CREATED).json({
                        statusCode: 201,
                        success: 1,
                        error: 0,
                        data: resultedData,
                        message: await this.translatorService.frontendReadTranslation(req?.lang, "MSG_CUSTOM_POINT_UPLOADED"),
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
    @UseGuards(AccessGuard)
    @Post('mapping-data')
    async mappingData(@Req() req: Request, @Res() res: Response, @Body() postData: mappingDataInput) {
        try {
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            if (!postData?.hash) {
                throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let pointHeaderData: any = appConstant.UPLOAD_POINT_HEADER_DATA;
            let pointHeaderDataArray: string[] = Object.values(pointHeaderData)
            const where: FindOptionsWhere<HealthRequestEntity> = { hash: postData.hash, org_id: postData?.org_id, created_by: postData.user_id, status: Not(2) };
            let recordDetails: HealthRequestEntity | null = await this.healthRequestService.findOne(where,['id','schedule_id','org_sheet_header','mapped_header','status']);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND");
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

            let autoMapped: KeyValueObject = {};
            const sanitizeString = (input: string) => input.replace(/\xEFBF/g, "").replace(/ /g, "").replace(/\*/g, "").toLowerCase();
            const mapAutoMapped = async (tempMap, dragZone, autoMapped) => {
                for (const [zoneIndex, zoneValue] of Object.entries(tempMap)) {
                    const zoneSanitized: string = sanitizeString(zoneValue.toString());
                    let matchIndex: string = '';

                    for (let dragIndex: number = 0; dragIndex < dragZone.length; dragIndex++) {
                        const dragSanitized: string = sanitizeString(dragZone[dragIndex]);
                        if (zoneSanitized === dragSanitized) {
                            matchIndex = dragIndex.toString();
                            break;
                        }
                    }
                    autoMapped[zoneIndex] = matchIndex || '';
                }
            };


            const getExcelColumnName = (index: number): string => {
                let name = '';
                while (index >= 0) {
                    name = String.fromCharCode((index % 26) + 65) + name;
                    index = Math.floor(index / 26) - 1;
                }
                return name;
            };
            let columnIndex: number = Number(pointHeaderDataArray.length) + 1;
            let dropZoneActivity: any = {};
            let getActivities: HealthActivityEntity[] = await this.frontService.healthActivityListRecord(['id','name'],{schedule_id: recordDetails?.schedule_id,org_id: postData?.org_id,status: '1'},{'id': "ASC"});
            if (getActivities.length > 0) {
                for (let i: number = 0; i < getActivities.length; i++) {
                    const activity: HealthActivityEntity = getActivities[i];
                    const label: string | undefined = activity?.name;
                    if (!label) continue;
                    const col1: string = getExcelColumnName(columnIndex++);
                    const col2: string = getExcelColumnName(columnIndex++);
                    const tempMap: Record<string, string> = {
                        [col1]: label,
                        [col2]: `${label}_Date`,
                    };
                    dropZoneActivity[label] = tempMap
                    await mapAutoMapped(tempMap, dragZone, autoMapped);
                }
            }


            if(!recordDetails['mapped_header']) {
                await mapAutoMapped(pointHeaderData, dragZone, autoMapped);
            } else {
                autoMapped = JSON.parse(recordDetails['mapped_header']);
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {hash: postData?.hash,status: recordDetails['status'],drop_zone:pointHeaderData,auto_mapped:autoMapped,drag_zone:dragZone,drop_zone_activity: dropZoneActivity},
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
    @Post('save-mapping-data')
    async saveMappingData(@Req() req: Request, @Res() res: Response, @Body() postData: saveMappingDataInput) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.hash || !postData?.mapped_header) {
                throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where: FindOptionsWhere<HealthRequestEntity> = { hash: postData?.hash };
            let recordDetails: HealthRequestEntity | null = await this.healthRequestService.findOne(where,['id','schedule_id','org_sheet_header','mapped_header','status']);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.healthRequestService.update(where, { mapped_header: postData.mapped_header, status: 3 })
            this.activityLogService.create(recordDetails, {mapped_header: postData.mapped_header, status: 3}, tableConstant.CHALLENGE.TBL_CH_HEALTH_REQUEST, req.tokenUser?.id,'update');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {status: 'show_mapping_data', hash: postData?.hash},
                message: await this.translatorService.frontendReadTranslation(req?.lang, "MAPPING_DATA_DONE"),
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
    @Post('show-mapping-data')
    async showMappingData(@Req() req: Request, @Res() res: Response, @Body() postData: showMappingDataInput) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.hash) {
                throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let message: string = '';
            let recordDetails: HealthRequestEntity | null = await this.healthRequestService.findOne({hash: postData?.hash,status: 3},['id','schedule_id','origional_file','org_sheet_header','mapped_header','status']);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            }
            let mappedHeader = JSON.parse(recordDetails['mapped_header']);
            let pointHeaderData: any = appConstant.UPLOAD_POINT_HEADER_DATA;
            let pointHeaderDataArray: string[] = Object.values(pointHeaderData)
            const selectedMappedHeader: any = Object.fromEntries(
                Object.entries(mappedHeader).filter(([key, value]) => value !== "")
            );
            const getExcelColumnName = (index: number): string => {
                let name: string = '';
                while (index >= 0) {
                    name = String.fromCharCode((index % 26) + 65) + name;
                    index = Math.floor(index / 26) - 1;
                }
                return name;
            };
            let columnIndex: number = Number(pointHeaderDataArray.length) + 1;
            let dropZoneActivity: any = {};
            let getActivities: HealthActivityEntity[] = await this.frontService.healthActivityListRecord(['id','name'],{schedule_id: recordDetails?.schedule_id,org_id: postData?.org_id,status: '1'},{'id': "ASC"});
            if (getActivities.length > 0) {
                for (let i: number = 0; i < getActivities.length; i++) {
                    const activity: HealthActivityEntity = getActivities[i];
                    const label: string | undefined = activity?.name;
                    if (!label) continue;
                    const col1: string = getExcelColumnName(columnIndex++);
                    const col2: string = getExcelColumnName(columnIndex++);
                    const tempMap: Record<number, string> = {
                        [col1]: label,
                        [col2]: `${label}_Date`,
                    };
                    dropZoneActivity = {...dropZoneActivity, ...tempMap}
                }
            }
            let headerData = {...pointHeaderData, ...dropZoneActivity}
            let activityKey: string[] = Object.keys(dropZoneActivity);
            const defaultHeader = {};
            const keys: string[] = Object.keys(headerData);
            let mappedActivityCount: number = 0
            for (let i: number = 0; i < keys.length; i++) {
                const key: string = keys[i];
                if (selectedMappedHeader[key] !== undefined) {
                    defaultHeader[selectedMappedHeader[key]] = headerData[key];
                } else {
                    if (activityKey.includes(key)) {
                        mappedActivityCount++
                    }
                }
            }
            if (activityKey.length == mappedActivityCount) {
                message = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_CUSTOM_POINT_MAPPED")
            }
            let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `${recordDetails['origional_file'].replace(/\.[^/.]+$/, '.json')}`, userBucket: 'private'}));
            let sheetData: any = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
            sheetData = sheetData.slice(1);
            let sheetDataCount = sheetData.length
            if (!sheetDataCount) {
                throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_DATA_NOT_FOUND"));
            }
            let resultedData = [];
            let activityCount: number = 0;
            const maxPreviewRows: number = 5;

            for (let i: number = 0; i < sheetDataCount; i++) {
                const row: Record<string, any> = {};
                for (const key in defaultHeader) {
                    const fieldName = defaultHeader[key];
                    let cellValue = sheetData[i]?.[key];
                    if (fieldName.toLowerCase().includes('_date')) {
                        const monthName = await this.commonDateService.DateTimeFormat(cellValue, 'MMMM');
                        const translatedMonth = await this.translatorService.frontendReadTranslation(req?.lang, monthName.toString(), `/LC_MESSAGES/Common/Month`, `static`);
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
            }
            let totalActivity: number = activityKey.length / 2;
            if ((sheetDataCount * totalActivity) == activityCount) {
                message = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_ADD_AT_LEAST_ONE_POINT")
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {hash: postData?.hash,tabledata: resultedData, defaultHeader: defaultHeader, count: sheetDataCount, message: message},
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

    @UseGuards(AccessGuard)
    @Post('undo-request-data')
    async undoRequestData(@Req() req: Request, @Res() res: Response, @Body() postData: undoRequestDataInput) {
        try {
            let user =  req.tokenUser;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.hash) {
                throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let recordDetails: HealthRequestEntity | null = await this.healthRequestService.findOne({hash: postData?.hash},['id','schedule_id','org_sheet_header','mapped_header','status','created_file']);
            if (!recordDetails?.created_file) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 0,
                    error: 1,
                    data: null,
                    message: errorMessage,
                });
            }
            let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `${recordDetails['created_file'].replace(/\.[^/.]+$/, '.json')}`, userBucket: 'private'}));
            let JsonData: any = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
            if (!JsonData.length) {
                throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_DATA_NOT_FOUND"));
            }

            const idArray = [];
            for (let i: number = 0; i < JsonData.length; i++) {
                idArray.push(JsonData[i].id);
            }
            let healthUsersActivityDetails = await this.healthUsersActivityService.listRecord({id: In(idArray),org_id: postData?.org_id, created_by: user.id, status: Not(2)});
            await this.healthUsersActivityService.update({id: In(idArray),org_id: postData?.org_id, created_by: user.id, status: Not(2)},{status: '2'});
            let milesPointRevert = {status: '0',created_file: null,rejected_file: null}
            await this.healthRequestService.update({hash: postData?.hash},milesPointRevert);
            this.activityLogService.create(recordDetails, milesPointRevert, tableConstant.CHALLENGE.TBL_CH_HEALTH_REQUEST, req.tokenUser?.id,'update');
            this.activityLogService.create(healthUsersActivityDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_HEALTH_USERS_ACTIVITY, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req?.lang, "MSG_UNDO_CUSTOM_POINT"),
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
    @Post('import-cancel')
    async importCancel(@Req() req: Request, @Res() res: Response, @Body() postData: importCancelInput) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.hash) {
                throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let recordDetails: HealthRequestEntity | null = await this.healthRequestService.findOne({hash: postData?.hash},['id','schedule_id','org_sheet_header','mapped_header','status']);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.healthRequestService.update({hash: postData?.hash}, { status: '4' });
            this.activityLogService.create(recordDetails, { status: '4' }, tableConstant.CHALLENGE.TBL_CH_HEALTH_REQUEST, req.tokenUser?.id,'update');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req?.lang, "IMPORT_CANCEL"),
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
    @Post('request-delete')
    async requestDelete(@Req() req: Request, @Res() res: Response, @Body() postData: requestDeleteInput) {
        try {
            let user =  req.tokenUser;
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, org_id: postData?.org_id, created_by: user.id, status: Not(2) };
            let recordDetails: HealthRequestEntity | null = await this.healthRequestService.findOne(where,['id','schedule_id','org_sheet_header','mapped_header','status','created_file']);
            if (!recordDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req?.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            if (recordDetails['created_file']) {
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `${recordDetails['created_file'].replace(/\.[^/.]+$/, '.json')}`, userBucket: 'private'}));
                let JsonData: any = JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8'));
                if (!JsonData.length) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req?.lang, "ERR_DATA_NOT_FOUND"));
                }
                const idArray = [];
                for (let i: number = 0; i < JsonData.length; i++) {
                    idArray.push(JsonData[i].id);
                }
                let healthUsersActivityDetails = await this.healthUsersActivityService.listRecord({id: In(idArray),org_id: postData?.org_id, created_by: user.id, status: Not(2)});
                await this.healthUsersActivityService.update({id: In(idArray),org_id: postData?.org_id, created_by: user.id, status: Not(2)},{status: '2'});
                this.activityLogService.create(healthUsersActivityDetails, {status: 2}, tableConstant.CHALLENGE.TBL_CH_HEALTH_USERS_ACTIVITY, req.tokenUser?.id, 'delete');
            }
            await this.healthRequestService.update(
                { id: postData?.id, org_id: postData?.org_id, created_by: user.id, status: Not(2) },
                { status: 2 },
            );
            this.activityLogService.create(recordDetails, { status: 2 }, tableConstant.CHALLENGE.TBL_CH_HEALTH_REQUEST, req.tokenUser?.id,'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req?.lang, 'MSG_POINT_DELETED', `/LC_MESSAGES/Common/Common`,`static`)+'.',
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
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: GetOneRequestDataInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            let resultedData: HealthRequestEntity | null = await this.healthRequestService.findOne({id: postData?.id, user_id: postData?.user_id});
            resultedData = <any>(
                await this.commonArrayService.formatToDto(HealthRequestDto, resultedData, req.lang)
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