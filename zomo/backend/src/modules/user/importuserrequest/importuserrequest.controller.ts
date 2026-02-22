import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, ImportUserRequestDto, tableConstant } from '@common-constants';
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
import * as md5 from 'md5';
import * as moment from 'moment-timezone';
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { ClientManagerAssignService } from 'src/modules/company/clientmanagerassign/clientmanagerassign.service';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { CreateImportUserRequestInput, PaginateWithCompanyInput } from '../../../input';
import { fileFilter, fileName } from "../../../utils/image-upload.utils";
import { BrokerService } from "../../broker/broker.service";
import { CensusCustomFieldsService } from '../../company/censuscustomfields/censuscustomfields.service';
import { CompanyService } from '../../company/companies/company.service';
import { SettingsService } from "../../company/settings/settings.service";
import { TranslationService } from '../../translation/translation.service';
import { UserReportService } from '../userreport/userreport.service';
import { ImportUserRequestService } from "./importuserrequest.service";
let S3_URL = process.env.S3_URL_PROD;
S3_URL = S3_URL.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD);
const path = require('path');
@Controller('import-user-request')
@UseGuards(TokenGuard, RoleGuard)
export class ImportUserRequestController {
    constructor(
        private readonly importUserRequestService: ImportUserRequestService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly companyService: CompanyService,
        private readonly brokerService: BrokerService,
        private readonly censusCustomFieldsService: CensusCustomFieldsService,
        private readonly companySettingsService: SettingsService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly userreportservice: UserReportService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            const whereClauses: string[] = [];

            const { role_id, id: userId, org_id: userOrgId } = req.tokenUser || {};

            // Status filter
            if (postData?.status !== undefined && postData?.status !== null) {
                whereClauses.push(`importUser.status = ${postData.status}`);
            } else {
                whereClauses.push(`importUser.status IN (0,1,10,11)`);
            }

            // Org filter logic
            let effectiveOrgId: number | null = null;

            if (role_id === 11) {
                effectiveOrgId = userOrgId || null;
            } else if (role_id !== 1) {
                effectiveOrgId = postData?.org_id || null;
            }

            if (effectiveOrgId) {
                whereClauses.push(`importUser.org_id = ${effectiveOrgId}`);
            }

            // Client Engagement Manager special condition
            if (role_id === appConstant.ROLE.CLIENTENGAGEMENTMANAGER) {
                const assignedOrgs = await this.clientManagerAssignService.listRecord({ user_id: userId, status: 1 }, null);

                if (!assignedOrgs?.length) {
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: {
                            list: [],
                            limit: postData?.limit,
                            page: postData?.page,
                            pages: 0,
                            total: 0
                        },
                        message: 'success',
                    });
                }

                const orgIds = assignedOrgs.map(ele => ele.org_id).join(',');
                whereClauses.push(`importUser.org_id IN (${orgIds})`);
            }

            // Request date filter
            if (postData?.request_date) {
                const startDate = moment(postData.request_date).startOf('day').format('YYYY-MM-DD HH:mm:ss');
                const endDate = moment(postData.request_date).endOf('day').format('YYYY-MM-DD HH:mm:ss');
                whereClauses.push(`importUser.request_date BETWEEN '${startDate}' AND '${endDate}'`);
            }

            // Search string filter
            if (postData?.search_str?.trim()) {
                const safeSearch = postData.search_str.replace(/'/g, "''");
                whereClauses.push(`(
                importUser.email LIKE '%${safeSearch}%' OR
                importUser.origional_file LIKE '%${safeSearch}%' OR
                importUser.created_file LIKE '%${safeSearch}%' OR
                importUser.updated_file LIKE '%${safeSearch}%' OR
                importUser.rejected_file LIKE '%${safeSearch}%' OR
                importUser.file_error LIKE '%${safeSearch}%' OR
                company.company_name LIKE '%${safeSearch}%'
            )`);
            }

            const where = whereClauses.join(' AND ');

            // Fetch paginated data
            const resultedData = await this.importUserRequestService.paginateList(where, postData);

            // Handle undo logic only if org_id exists
            let undoData = null;
            if (effectiveOrgId) {
                undoData = await this.importUserRequestService.findOne(
                    { org_id: effectiveOrgId, status: '1' },
                    { request_date: 'DESC' }
                );
            }

            const formattedList = await this.commonArrayService.formatToDto(
                ImportUserRequestDto,
                resultedData.list || [],
                req.lang
            );

            // Apply undo flag
            if (undoData) {
                for (const item of formattedList) {
                    item.undo = item.id === undoData.id ? 1 : 0;
                }
            }

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {
                    ...resultedData,
                    list: formattedList
                },
                message: 'success',
            });

        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
            let where = postData?.id ? postData?.user_id ? { id: postData?.id, user_id: postData?.user_id } : { id: postData?.id}: { user_id: postData?.user_id};
            this.commonFileService.addMembershipCodeCondition(req, where)
            if(postData?.org_id){
                where['org_id'] = postData?.org_id;
            }
            let recordDetails = await this.importUserRequestService.findOne(where);
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
    @Post('create')
    @UseInterceptors(
        FileInterceptor("origional_file", {
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.CENSUS_FILE_PATH}`,
                filename: fileName
            }),
            fileFilter: fileFilter
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateImportUserRequestInput, @UploadedFile() file: Express.Multer.File) {
        /*const rateLimiter = new RateLimiterMiddleware();
        await rateLimiter.use(req, res, async () => {*/
            try {
                postData.source = 1;
                postData.user_id = postData?.user_id ?? req.tokenUser?.id;
                postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
                postData.email = postData?.email ?? req.tokenUser?.email;
                if(req.tokenUser?.role_id == appConstant.ROLE.BROKERADMIN){
                    let brokerListData = await this.brokerService.brokerListRecord({org_id: postData?.org_id, broker_admin_id: postData?.user_id});
                    if (brokerListData.length == 0) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                    }
                } else if (req.tokenUser?.role_id == appConstant.ROLE.BROKER) {
                    let brokerListData = await this.brokerService.brokerListRecord({org_id: postData?.org_id, user_id: postData?.user_id, is_global: 1});
                    if (brokerListData.length == 0) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                    }
                } else if (req.tokenUser?.role_id == appConstant.ROLE.REGIONALADMIN) {
                    let brokerListData = await this.brokerService.brokerListRecord({org_id: postData?.org_id, user_id: postData?.user_id, is_global: 2});
                    if (brokerListData.length == 0) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_UNAUTHORIZATION_LOCATION"));
                    }
                }
                if (!postData?.user_id || !postData?.org_id || !postData?.email || ![0, 1].includes(postData?.census_upload_type) || ![0, 1].includes(postData?.user_notify) || ![0, 1].includes(postData?.cuser_notify) || ![0, 1].includes(postData?.reset_password) || !file) {
                    if (file && file.filename && file.fieldname === 'origional_file') {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
                let companyData = await this.companyService.companyFindOne({id: postData?.org_id},["company_name","status"]);
                if ((await this.importUserRequestService.checkExists({ org_id: postData?.org_id, status: 0, user_id: postData?.user_id }))) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "CENSUS_UPLOAD_MULTIPLE_REQUEST_SUCCESS"));
                }
                postData.status = postData.flage = postData.requeststep = 10;
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
                let redirectFlag: number = 0;
                let mappedHeader = '';
                const orgSheetHeader = postData?.org_sheet_header?.replace(/\//g, "\\/");

                const sharedConditions = {
                    org_sheet_header: orgSheetHeader,
                    status: '1',
                };

                const condition = [9, 5].map(value => ({
                    ...sharedConditions,
                    flage: value,
                    requeststep: value
                }));

                const recordDetails = await this.importUserRequestService.findOne(
                    condition,
                    { id: 'DESC' },
                    ['mapped_header']
                );
                if (recordDetails && recordDetails['mapped_header']) {
                    mappedHeader = recordDetails['mapped_header'];
                    let tmpDataCompare = JSON.parse(recordDetails['mapped_header']);
                    let censusCustomFieldData = await this.censusCustomFieldsService.listRecord(["title"], {
                        status: '1',
                        organization_id: postData?.org_id
                    });
                    if (Array.isArray(censusCustomFieldData) && censusCustomFieldData.length > 0) {
                        let censusCustomFieldTitles = censusCustomFieldData.map(item => item.title.toString().toLowerCase());
                        let numericKeyFilteredData: Record<string, string> = {};
                        Object.entries(tmpDataCompare).forEach(([key, value]) => {
                            const keyIsNumeric = !isNaN(Number(key));
                            if (keyIsNumeric) {
                                if (censusCustomFieldTitles.includes(key.toLowerCase())) {
                                    numericKeyFilteredData[key] = String(value);
                                }
                            } else {
                                numericKeyFilteredData[key] = String(value);
                            }
                        });
                        if (JSON.stringify(tmpDataCompare) !== JSON.stringify(numericKeyFilteredData)) {
                            redirectFlag = 1;
                            mappedHeader = JSON.stringify(numericKeyFilteredData);
                        } else {
                            mappedHeader = recordDetails['mapped_header'];
                        }
                    }
                }
                postData.mapped_header = mappedHeader;
                postData.request_date = await this.commonDateService.DateTimeFormat('now','YYYY-MM-DD HH:mm:ss').toString();
                let requestId = await this.importUserRequestService.save(postData);
                let resultedData: {status: string, id: string} | null = null;
                if (requestId['id']) {
                    let updateData = {hash: md5(requestId['id'])}
                    if (file && file.filename && file.fieldname === 'origional_file') {
                        // let companyData = await this.companyService.companyFindOne({id: postData?.org_id},["company_name"]);
                        file.originalname = this.commonFileService.formatFileName(file.originalname);
                        let filename = `userimport/${postData?.org_id}/${requestId['id']}/${companyData['company_name'].replace(/\s/g, "_")}/_${this.commonService.generateMD5(requestId['id'].toString())}.${file.originalname.split('.')[file.originalname.split('.').length - 1]}`;
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: filename, userBucket: 'private'}));
                        let Json_filename = `userimport/${postData?.org_id}/${requestId['id']}/${companyData['company_name'].replace(/\s/g, "_")}/_${this.commonService.generateMD5(requestId['id'].toString())}.${filePath.split('.')[filePath.split('.').length - 1]}`;                    
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(filePath),  filename: Json_filename, userBucket: 'private'}));
                        updateData['origional_file'] = filename;
                    }
                    await this.importUserRequestService.update({id: requestId['id']}, {...updateData});
                    let status = 'show_mapping_data';
                    if(mappedHeader == "" || redirectFlag == 1) {
                        status = 'mapping_data';
                    }
                    resultedData = {status: status, id: md5(requestId['id'])}
                }
                if (file && file.filename && file.fieldname === 'origional_file') {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }

                return res.status(HttpStatus.CREATED).json({
                    statusCode: 201,
                    success: 1,
                    error: 0,
                    data: resultedData,
                    message: await this.translatorService.frontendReadTranslation(req.lang, "UNDO_REQUEST_SUCCESS"),
                });
            } catch (error) {
                if (file && file.filename && file.fieldname === 'origional_file') {
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
        /*});*/
    }
    @UseGuards(AccessGuard)
    @Post('show-mapping-data')
    async showMappingData(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.user_id ??= req.tokenUser?.id;
            postData.org_id ??= req.tokenUser?.org_id;

            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }

            const defaultHeader: Record<string, string> = {
                ...appConstant.GENERAL_HEADER_DATA,
                ...appConstant.SPOUSE_HEADER_DATA,
                ...appConstant.LINKED_HEADER_DATA
            };

            const recordDetails = await this.importUserRequestService.findOne(
                { hash: postData.id },
                { id: "DESC" },
                ['org_id', 'mapped_header', 'origional_file']
            );

            if (!recordDetails) {
                const errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }

            const mappedHeader = JSON.parse(recordDetails.mapped_header || '{}');

            const companySettingData = await this.companySettingsService.findOne(
                { org_id: postData.org_id },
                ["census_status"]
            );

            if (companySettingData?.census_status === 1) {
                const censusFields = await this.censusCustomFieldsService.listRecord(
                    ["id", "title"],
                    { status: '1', organization_id: postData.org_id }
                );

                for (const field of censusFields) {
                    defaultHeader[`Z${field.id}`] = field.title;
                }
            }

            const jsonFilePath = recordDetails.origional_file.replace(/\.(xlsx|csv)$/i, '.json');
            const fileData = await lastValueFrom(
                this.commonMicroservice.send({ cmd: 'get_file' }, { path: jsonFilePath, userBucket: 'private' })
            );

            const decoded = Buffer.from(fileData.Body, 'base64').toString('utf-8');
            let sheetData: any[] = JSON.parse(decoded).slice(1); // Remove header row

            sheetData = await this.mapped_sheet_data(sheetData, mappedHeader, 'header');

            const filteredData: any[] = [];
            for (let i = 0; i < sheetData.length && filteredData.length < 5; i++) {
                if (Object.values(sheetData[i]).some(v => v !== null)) {
                    filteredData.push(sheetData[i]);
                }
            }

            const resultedData = filteredData.map((rowData, index) => {
                const row: Record<string, any> = {};
                for (const key in defaultHeader) {
                    if (mappedHeader[key]) {
                        const value = sheetData[index]?.[key];
                        if (['O', 'P', 'BC'].includes(key) && typeof value === 'number') {
                            const date = new Date(Math.round((value - 25569) * 86400 * 1000));
                            row[key] = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
                        } else {
                            row[key] = value ?? '-';
                        }
                    } else {
                        row[key] = '-';
                    }
                }
                return row;
            });

            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {
                    tabledata: resultedData,
                    defaultHeader,
                    count: sheetData.length
                },
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id, req.originalUrl, error?.message, error, req);
            throw new HttpException({
                statusCode: 401,
                success: 0,
                error: 1,
                message: error?.message,
                data: null,
            }, HttpStatus.BAD_REQUEST);
        }
    }

    @UseGuards(AccessGuard)
    @Post('mapping-data')
    async mappingData(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let dropZone: any = appConstant.GENERAL_HEADER_DATA;
            const recordDetails = await this.importUserRequestService.findOne({hash: postData?.id},{id: "DESC"},['org_id','org_sheet_header','spouserequired','mapped_header','status']);
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
            let companySettingData = await this.companySettingsService.findOne({org_id: postData?.org_id},["census_status"]);
            if (companySettingData && companySettingData['census_status'] == 1) {
                let censusCustomFieldData = await this.censusCustomFieldsService.listRecord(["id","title"],{status: '1',organization_id: postData?.org_id});
                if (censusCustomFieldData.length > 0) {
                    let censusCustomFieldHeader = Object.fromEntries(censusCustomFieldData.map(item => {
                        return [`Z${item.id}`, item.title];
                    }));
                    dropZone = {...dropZone, ...censusCustomFieldHeader}
                }
            }
            type KeyValueObject = {[index: string]: string};
            let dragZone: string[] = JSON.parse(recordDetails.org_sheet_header);
            let emailMatch: string[] = ["e-mail", "mail"];
            let ssnMatch: string[] = ["socialsecuritynumber"];
            let dobMatch: string[] = ["dob", "dateofbirth"];
            let dohMatch: string[] = ["doh", "hiredate"];
            let dropZoneSpouse: KeyValueObject = appConstant.SPOUSE_HEADER_DATA;
            let dropZoneEmp: KeyValueObject = appConstant.LINKED_HEADER_DATA;
            let autoMapped: KeyValueObject = {};
            const sanitizeString = (input: string) => input.replace(/\xEFBF/g, "").replace(/ /g, "").replace(/\*/g, "").toLowerCase();
            if(recordDetails['mapped_header'] === "") {
                const zones = [dropZone, dropZoneSpouse, dropZoneEmp];
                zones.forEach(zone => {                
                    Object.entries(zone).forEach(([zoneIndex, zoneValue]) => {                        
                        let zoneSanitized = sanitizeString(zoneValue.toString());
                        let matchIndex = '';
                        dragZone.some((dragValue, dragIndex) => {
                            let dragSanitized = sanitizeString(dragValue);
                            const matchGroups: {[key: string]: string[]} = {
                                email: emailMatch,
                                ssn: ssnMatch,
                                birthdate: dobMatch,
                                dateofhire: dohMatch,
                                spouseonhealthplan: ["spouseonhealthplan","spouseonmedicalplan"]
                            };
                            if(zoneSanitized === dragSanitized || (zoneSanitized in matchGroups && matchGroups[zoneSanitized].includes(dragSanitized))) {
                                matchIndex = dragIndex.toString();
                                return true;
                            }
                            return false;
                        });
                        autoMapped[zoneIndex.toString()] = '';
                        if(matchIndex) {
                            autoMapped[zoneIndex.toString()] = matchIndex;
                        }
                    });
                });
            } else {
                autoMapped = JSON.parse(recordDetails['mapped_header']);
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {status: recordDetails['status'],drop_zone:dropZone,auto_mapped:autoMapped,drag_zone:dragZone,drop_zone_spouse:dropZoneSpouse,drop_zone_emp:dropZoneEmp},
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
    async saveMappingData(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id || !postData?.mapped_header) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { hash: postData?.id };
            const recordDetails = await this.importUserRequestService.findOne(where);
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
            await this.importUserRequestService.update(where, { mapped_header: postData.mapped_header });
            this.activityLogService.create(recordDetails, {mapped_header: postData.mapped_header}, tableConstant.TBL_IMPORT_USER_REQUEST, req.tokenUser?.id);
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
    @UseGuards(AccessGuard)
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            this.commonFileService.addMembershipCodeCondition(req, where)
            const recordDetails = await this.importUserRequestService.findOne(where);
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
            await this.importUserRequestService.update(where,{ status: 2 });
            this.activityLogService.create(recordDetails, {status: 2}, tableConstant.TBL_IMPORT_USER_REQUEST, req.tokenUser?.id, 'delete');
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateImportUserRequestInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { hash: postData?.id };
            const recordDetails = await this.importUserRequestService.findOne(where);
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
            if (postData?.mapped_header) {
                let mappedData = JSON.parse(postData?.mapped_header);
                let mappedHeader = {};
                for (let key in mappedData) {
                    let newKey = await this.commonService.getNumericPart(key);
                    mappedHeader[newKey] = postData?.mapped_header[key];
                }
                postData.mapped_header = JSON.stringify(mappedHeader)
            }
            await this.importUserRequestService.update(where, postData);
            this.activityLogService.create(recordDetails, postData, tableConstant.TBL_USERS, req.tokenUser?.id);
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
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const where = {};
            let resultedData = await this.importUserRequestService.listRecord(where);
            resultedData = <any>(
                await this.commonArrayService.formatToDto(ImportUserRequestDto, resultedData, req.lang)
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
    @Post('import-cancel')
    async importCancel(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { hash: postData?.id };
            const recordDetails = await this.importUserRequestService.findOne(where);
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
            await this.importUserRequestService.update(where, { status: 11 });
            this.activityLogService.create(recordDetails, { status: 11 }, tableConstant.TBL_IMPORT_USER_REQUEST, req.tokenUser?.id);
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
    @UseGuards(AccessGuard)
    @Post('undo-request-data')
    async undoRequestData(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            const userId = postData?.user_id ?? req.tokenUser?.id;
            const orgId = postData?.org_id ?? req.tokenUser?.org_id;
            const requestId = postData?.id;

            if (!requestId) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }

            const record = await this.importUserRequestService.findOne({ hash: requestId });

            if (!record) {
                const notFoundMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: notFoundMessage,
                });
            }

            const timestamp = await this.commonDateService.getTodayDate().format('YYYY-MM-DD HH:mm:ss');

            // Prepare undo request data
            const undoData: any = {
                user_id: record.user_id,
                org_id: record.org_id,
                parent_id: record.id,
                email: record.email,
                source: 1,
                source_type: 1,
                census_upload_type: 1,
                request_date: timestamp,
                created_date: timestamp,
                updated_date: timestamp
            };

            // Read backup file
            const sourceDirectory = `userimport/${record.org_id}/${record.id}`;
            const backupFileName = 'bkpdata.json';

            const fileReadResponse = await lastValueFrom(this.commonMicroservice.send({ cmd: 'get_file' }, {
                path: `${sourceDirectory}/${backupFileName}`,
                userBucket: 'private'
            }));

            const backupData = JSON.parse(Buffer.from(fileReadResponse.Body, 'base64').toString('utf-8'));
            undoData.org_sheet_header = JSON.stringify(Object.keys(backupData[0]));

            // Mapping logic
            let dropZone = { ...appConstant.GENERAL_HEADER_DATA };

            const companySettings = await this.companySettingsService.findOne({ org_id: orgId }, ["census_status"]);
            if (companySettings?.census_status === 1) {
                const customFields = await this.censusCustomFieldsService.listRecord(["id", "title"], {
                    status: '1',
                    organization_id: orgId
                });

                if (customFields?.length > 0) {
                    const customHeaders = Object.fromEntries(
                        customFields.map(field => [`Z${field.id}`, field.title])
                    );
                    dropZone = { ...dropZone, ...customHeaders };
                }
            }

            const sanitize = (str: string) => str.replace(/\xEFBF/g, "").replace(/ /g, "").replace(/\*/g, "").toLowerCase();
            const dragHeaders: string[] = JSON.parse(record.org_sheet_header);

            const matchGroups: { [key: string]: string[] } = {
                email: ["e-mail", "mail"],
                ssn: ["socialsecuritynumber"],
                birthdate: ["dob", "dateofbirth"],
                dateofhire: ["doh", "hiredate"],
                spouseonhealthplan: ["spouseonhealthplan", "spouseonmedicalplan"]
            };

            const autoMapped: { [index: string]: string } = {};
            const allZones = [
                dropZone,
                appConstant.SPOUSE_HEADER_DATA,
                appConstant.LINKED_HEADER_DATA
            ];

            for (const zone of allZones) {
                for (const [zoneKey, zoneLabel] of Object.entries(zone)) {
                    const sanitizedZone = sanitize(zoneLabel.toString());
                    let matchedIndex = '';

                    for (let i = 0; i < dragHeaders.length; i++) {
                        const sanitizedHeader = sanitize(dragHeaders[i]);
                        if (
                            sanitizedZone === sanitizedHeader ||
                            (matchGroups[sanitizedZone] && matchGroups[sanitizedZone].includes(sanitizedHeader))
                        ) {
                            matchedIndex = i.toString();
                            break;
                        }
                    }

                    autoMapped[zoneKey] = matchedIndex;
                }
            }

            undoData.status = 0;
            undoData.flage = 0;
            undoData.requeststep = 0;
            undoData.mapped_header = JSON.stringify(autoMapped);

            // Save undo request
            const [savedRequest] = await this.importUserRequestService.save([undoData]);

            // File handling paths
            const localDirectory = `${appConstant.CENSUS_FILE_PATH}${savedRequest.id}`;
            const jsonFileName = 'originaldata.json';
            const jsonFilePath = path.resolve(`${localDirectory}/${jsonFileName}`);
            const csvFilePath = jsonFilePath.replace('.json', '.csv');

            const bucketBasePath = `userimport/${record.org_id}/${savedRequest.id}`;
            const jsonBucketKey = `${bucketBasePath}/originaldata.json`;
            const csvBucketKey = `${bucketBasePath}/originaldata.csv`;

            // Write JSON locally
            const writeResult = await this.commonFileService.writeFile(localDirectory, JSON.stringify(backupData), jsonFileName);
            if (writeResult?.status !== 'success') {
                throw new Error('Failed to write originaldata.json');
            }

            // Convert to CSV
            const csvResult :any = await this.commonFileService.createJsonToFile(1, jsonFilePath, 'pythonjsontocsv.py');
            if (csvResult?.status !== 'success') {
                throw new Error('Failed to convert JSON to CSV');
            }

            // Confirm CSV file exists
            const fileExists = await this.commonFileService.fileExist(csvFilePath);
            if (!fileExists) {
                throw new Error('CSV file not found after conversion');
            }

            // Upload JSON
            await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, {
                path: jsonFilePath,
                filename: jsonBucketKey,
                userBucket: 'private'
            }));

            // Upload CSV
            await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, {
                path: csvFilePath,
                filename: csvBucketKey,
                userBucket: 'private'
            }));

            // Clean up local files
            await this.commonFileService.removeFolderFromLocal(localDirectory);

            // Update DB
            await this.importUserRequestService.update(
                { id: savedRequest.id },
                {
                    origional_file: csvBucketKey,
                    hash: md5(savedRequest.id)
                }
            );

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, "UNDO_REQUEST_SUCCESS"),
            });

        } catch (error) {
            console.error(error);
            await this.activityLogService.error_log(req.tokenUser?.id, req.originalUrl, error?.message, error, req);

            throw new HttpException(
                {
                    statusCode: 401,
                    success: 0,
                    error: 1,
                    message: error?.message || 'Internal Server Error',
                    data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }


    async mapped_sheet_data(sheetData, mapped_header, usecase) {   
        if(usecase == 'header'){
            sheetData = sheetData.map((item) => {
                let newItem: any = {};
                    for (let key in mapped_header) {
                        if (mapped_header[key] && item[mapped_header[key]]) {
                        newItem[key] = item[mapped_header[key]].toString().trim();
                    } else {
                        newItem[key] = null;
                    }
                }
                return newItem;
            }); 
        } else if (usecase == 'table_header') {
            sheetData = sheetData.map((item) => {
                let newItem: any = {};
                for (let key in mapped_header) {
                    if (mapped_header[key] && item[key]) {
                        newItem[mapped_header[key]] = item[key].toString().trim();
                    } else {
                        newItem[mapped_header[key]] = null;
                    }
                }
                return newItem;
            });
        }                          
        return sheetData;
    }
}
