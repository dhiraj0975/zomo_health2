import {
    appConstant, CommonArrayService, CommonFileService, CommonService, CommunicationEmailCampaignRequestsDto,
    CommunicationEmailCampaignTemplatesDto,
    CommunicationEmailConfigDto, CsvService, HtmlTagService, tableConstant
} from '@common-constants';
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
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import * as pathInfo from 'path';
import { lastValueFrom } from 'rxjs';
import { CreateCommunicationEmailCampaignRequestsInput, PaginateWithCommunicationInput } from 'src/input';
import { CampaignService } from 'src/modules/campaign/campaign/campaign.service';
import { CampaignRewardService } from 'src/modules/campaign/reward/campaignreward.service';
import { ScheduleChallengeService } from 'src/modules/challenge/schedulechallenge/schedulechallenge.service';
import { CompanyService } from 'src/modules/company/companies/company.service';
import { DepartmentService } from 'src/modules/company/departments/department.service';
import { LocationService } from 'src/modules/company/locations/location.service';
import { EventService } from 'src/modules/events/events/events.service';
import { EventGlobalEventsService } from 'src/modules/events/globalevents/globalevents.service';
import { QuizAssignQuizOrgService } from 'src/modules/quiz/assignquizorgs/assignquizorgs.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { UserService } from 'src/modules/user/user/user.service';
import { attachmentFileFilter, datafileFilter, fileName } from 'src/utils/image-upload.utils';
import { Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { ActivityLogService } from "../../master/activitylog/activitylog.service";
const S3_URL = process.env.S3_URL_PROD;
const S3COMMUNICATION_URL = process.env.AWS_COMMUNICATION_BUCKET_URL;
const path = require('path');
@Controller('communication/email-campaign-requests')
@UseGuards(TokenGuard, RoleGuard)
export class EmailCampaignRequestsController {
    constructor(
        @Inject('COMMUNICATION_SERVICE')
        private client: ClientProxy,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly csvService: CsvService,
        private readonly companyService: CompanyService,
        private readonly departmentService: DepartmentService,
        private readonly locationService: LocationService,
        private readonly htmlTagService: HtmlTagService,
        private readonly userService: UserService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly quizAssignQuizOrgService: QuizAssignQuizOrgService,
        private readonly campaignService: CampaignService,
        private readonly eventGlobalEventsService: EventGlobalEventsService,
        private readonly eventService: EventService,
        private readonly campaignRewardService : CampaignRewardService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly activityLogService: ActivityLogService,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCommunicationInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            const loged_role_id = req.tokenUser?.role_id;
            const loged_user_id = req.tokenUser?.id;
            const loged_org_id = req.tokenUser?.org_id;
            let campRoleIdArr = [];
            if(loged_role_id == 40){
                campRoleIdArr = [loged_role_id];
            }else if(loged_role_id == 39){
                campRoleIdArr = [loged_role_id,40,11];
            }else if(loged_role_id == 38){
                campRoleIdArr = [loged_role_id,40,39,11];
            }else{
                campRoleIdArr = [loged_role_id,38,39];
            }
            let where = '';
            let createdByList = [];
            if(loged_role_id == 11){
                where += `((communication.for_org_id = '${loged_org_id}') AND (communication.request_status IN (0, 1, 2, 3, 4)) AND (communication.approval_status IN (0, 1, 2, 3))) AND communication.status != 2`;
                if(postData?.page == 1){
                    const getCreatedByOrgList = await this.userService.usersList({role_id:11, org_id:`${loged_org_id}`, status:1},["user.id", "CONCAT(user.first_name, ' ', user.last_name) AS name"],{ id: 'ASC' });
                    const getCreatedByOtherList = await this.userService.usersList('user.role_id IN (38,39) AND user.status = 1',["user.id", "CONCAT(user.first_name, ' ', user.last_name) AS name"],{ id: 'ASC' });
                    createdByList = getCreatedByOrgList.concat(getCreatedByOtherList);
                }
            }else{
                where += `communication.status != 2`;
                const getCreatedByOrgList = await this.userService.usersList({role_id:11, status:1},["user.id", "CONCAT(user.first_name, ' ', user.last_name) AS name"],{ id: 'ASC' });
                const getCreatedByOtherList = await this.userService.usersList('user.role_id IN (38,39,40) AND user.status = 1',["user.id", "CONCAT(user.first_name, ' ', user.last_name) AS name"],{ id: 'ASC' });
                createdByList = getCreatedByOrgList.concat(getCreatedByOtherList);
            }
            where +=` AND communication.parent_id = 0 `;
            if (postData?.search_str) {
                where += ` AND(communication.subject LIKE '%${postData?.search_str}%' OR communication.campaign_title LIKE '%${postData?.search_str}%')`;
            }
            if(postData?.status){
                if(postData?.status == 5){
                    where +=`AND communication.approval_status = 0 AND communication.request_status = 0`;
                }else if(postData?.status == 6){
                    where +=`AND communication.approval_status = 3`;
                }else if(postData?.status == 8){
                    where +=`AND communication.approval_status = 1`;
                }else if(postData?.status == 7){
                    where +=`AND communication.approval_status = 1`;
                }else if(postData?.status == 4){
                    where +=`AND communication.request_status = ${postData?.status}`;
                }else if(postData?.status == 9){
                    where +=`AND communication.request_status = 3`;
                }else if(postData?.status == 10){
                    where +=`AND communication.request_status = 5`;
                }else{
                    where +=`AND communication.approval_status = 2 AND communication.request_status = ${postData?.status}`;
                }
            }
            if(postData?.date){
                const startdate = `${postData?.date} 00:00:00`;
                const enddate = `${postData?.date} 23:59:59`;
                where += " AND DATE_FORMAT(communication.schedule_utc_datetime, '%Y-%m-%d %H:%i:%s' ) BETWEEN '" + startdate + "' AND '" + enddate + "'";
            }
            if(postData?.created_by){
                where +=` AND communication.created_by = ${postData?.created_by}`;
            }else{
                where +=` AND communication.role_id IN (${campRoleIdArr})`;
            }
            const paginateObj = this.commonArrayService.getPaginationVar(
                postData?.page || 1,
                postData?.limit,
            );
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'communication.created_date';
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'paginate_campaign_requests' }, {condition: where, order, orderBy, paginate: paginateObj}));
            if (campaignRequests.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignRequests['list'] = <any>(await this.commonArrayService.formatToDto(CommunicationEmailCampaignRequestsDto, campaignRequests['list'], req.lang));
            if(createdByList.length > 0){
                campaignRequests['createdByList'] = createdByList;
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: campaignRequests,
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
    @UseGuards(AccessGuard)
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id };
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, where));
            if (!campaignRequests) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignRequests = <any>(await this.commonArrayService.formatToDto(CommunicationEmailCampaignRequestsDto, campaignRequests, req.lang));
            let nextCampaignId = '';
            let prevCampaignId = '';
            if(campaignRequests && campaignRequests !== null && campaignRequests !== undefined && campaignRequests.with_option == '2' && campaignRequests.group_id && campaignRequests.group_id !== null && campaignRequests.group_id !== undefined){
                let campaignSubRequests = {};
                if(postData?.subcamphash && postData?.subcamphash !== null && postData?.subcamphash !== undefined){
                    const whereSub = { hash : postData?.subcamphash };
                    campaignSubRequests = await lastValueFrom(this.client.send({ cmd: 'get_first_campaign_requests' }, whereSub));
                    let campaignSubRequestslist = await lastValueFrom(this.client.send({ cmd: 'get_listhash_campaign_requests' }, { parent_id : postData?.id , group_id : campaignRequests.group_id }));
                    campaignSubRequestslist = campaignSubRequestslist.map(item => item.communication_hash);
                    const getNextPrevHash = await this.getSurroundingValues(campaignSubRequestslist, postData?.subcamphash);
                    nextCampaignId = getNextPrevHash['next'];
                    prevCampaignId = getNextPrevHash['previous'];
                }else{
                    const whereSub = { parent_id : postData?.id , group_id : campaignRequests.group_id };
                    campaignSubRequests = await lastValueFrom(this.client.send({ cmd: 'get_first_campaign_requests' }, whereSub));
                    let campaignSubRequestslist = await lastValueFrom(this.client.send({ cmd: 'get_listhash_campaign_requests' }, whereSub));
                    campaignSubRequestslist = campaignSubRequestslist.map(item => item.communication_hash);
                    const getNextPrevHash = await this.getSurroundingValues(campaignSubRequestslist, campaignSubRequests['hash']);
                    nextCampaignId = getNextPrevHash['next'];
                    prevCampaignId = getNextPrevHash['previous'];
                }
                campaignRequests['id'] = campaignSubRequests['id'];
                campaignRequests['hash'] = campaignSubRequests['hash'];
                campaignRequests['sheet_header'] = campaignSubRequests['sheet_header'];
                campaignRequests['template_content'] = campaignSubRequests['template_content'];
                campaignRequests['subject'] = campaignSubRequests['subject'];
                campaignRequests['attachment'] = campaignSubRequests['attachment'];
                campaignRequests['sendtestmailstatus'] = campaignSubRequests['sendtestmailstatus'];
                campaignRequests['testemail'] = campaignSubRequests['testemail'];
                campaignRequests['use_def_tem_id'] = campaignSubRequests['use_def_tem_id'];
                campaignRequests['template_type'] = campaignSubRequests['template_type'];
                campaignRequests['details_type'] = campaignSubRequests['details_type'];
                campaignRequests['template_item_id'] = campaignSubRequests['template_item_id'];
                campaignRequests['template_item_sub_id'] = campaignSubRequests['template_item_sub_id'];
                campaignRequests['for_org_id'] = campaignSubRequests['for_org_id'];
                campaignRequests['test_user_role'] = campaignSubRequests['test_user_role'];
                campaignRequests['test_user_id'] = campaignSubRequests['test_user_id'];
                campaignRequests['test_mail_user_data'] = campaignSubRequests['test_mail_user_data'];
            }
            var campaignOrgID = campaignRequests['for_org_id'];
            let companyLogo = '';
            if(campaignOrgID && typeof campaignOrgID !== null){
                companyLogo = await this.companyService.getCompnayLogoOnIdCode(campaignOrgID,'id');
            }
            if(campaignOrgID != 0 || companyLogo != ''){
                const checkFIleOnBucket = await lastValueFrom(this.commonMicroservice.send({cmd: 'check_file'}, {prefix: 'companylogos/' + campaignOrgID + '/' + companyLogo}));
                companyLogo = S3_URL + 'companylogos/' + campaignOrgID + '/' + companyLogo;
                if(!checkFIleOnBucket){
                    companyLogo = S3COMMUNICATION_URL + 'communication/oth/DefaultLogo.png';
                }
            }else{
                companyLogo = S3COMMUNICATION_URL + 'communication/oth/DefaultLogo.png';
            }
            if(campaignRequests['template_content'] !== null){
                campaignRequests['template_content'] = this.htmlTagService.clearDivContentByClass(campaignRequests['template_content'], 'logoDiv'); /* Append image */
                const modifiedHtml = this.htmlTagService.appendImageToLogoDivs(campaignRequests['template_content'], companyLogo); /* Append image */
                campaignRequests['template_content'] = modifiedHtml;
            }
            if (campaignRequests.with_option == 1 && campaignOrgID && campaignOrgID != 0) {
                campaignRequests['company'] = null;
                campaignRequests['departments'] = [];
                campaignRequests['locations'] = [];
                try {
                    const whereCompany = `company.deleted = 0 AND company.id = '${campaignOrgID}'`;
                    const companyDetails = await this.companyService.findOne(whereCompany);
                    if (companyDetails) {
                        campaignRequests['company'] = { id: companyDetails.id, company_name: companyDetails.company_name || '' };
                    }
                } catch (e) {
                    this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, e?.message, e, req);
                }
                try {
                    const deptList = await this.departmentService.listRecord({ status: 1, company_id: campaignOrgID, deleted: 0 }, { id: 'ASC' }, ['id', 'dept_name']) || [];
                    campaignRequests['departments'] = (deptList || []).map((d: any) => ({ id: d.id, dept_name: d.dept_name || '' }));
                } catch (e) {
                    this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, e?.message, e, req);
                }
                try {
                    const locList = await this.locationService.listRecord(['id', 'location_name'], { status: 1, company_id: campaignOrgID, deleted: 0 }, { id: 'ASC' }) || [];
                    campaignRequests['locations'] = (locList || []).map((l: any) => ({ id: l.id, location_name: l.location_name || '' }));
                } catch (e) {
                    this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, e?.message, e, req);
                }
            }
            /* Autofill - organization object for frontend */
            if (campaignOrgID && campaignOrgID != 0) {
                if (campaignRequests['company']) {
                    campaignRequests['organization'] = campaignRequests['company'];
                } else {
                    try {
                        const whereCompany = `company.deleted = 0 AND company.id = '${campaignOrgID}'`;
                        const companyDetails = await this.companyService.findOne(whereCompany);
                        campaignRequests['organization'] = companyDetails
                            ? { id: companyDetails.id, company_name: companyDetails.company_name || '' }
                            : { id: campaignOrgID, company_name: '' };
                    } catch (e) {
                        campaignRequests['organization'] = { id: campaignOrgID, company_name: '' };
                    }
                }
            } else {
                campaignRequests['organization'] = null;
            }
            let responseData = {};
            if(campaignRequests.with_option == '2' && campaignRequests.group_id && campaignRequests.group_id !== null && campaignRequests.group_id !== undefined){
                if(nextCampaignId !== null && prevCampaignId !== null){
                    responseData = {campaignRequests, nextCampaignId, prevCampaignId};
                }else if(nextCampaignId !== null && prevCampaignId === null){
                    responseData = {campaignRequests, nextCampaignId};
                }else if(prevCampaignId !== null && nextCampaignId === null){
                    responseData = {campaignRequests, prevCampaignId};
                }
            }else{
                responseData = {campaignRequests};
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: responseData,
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
        FileInterceptor('file', {
            limits: { fileSize: appConstant.FILE_SIZE_10MB, files: 1},
            storage: diskStorage({
                destination: `${appConstant.COMUNICATION_CAMPAIGN_FILE_TEMP_PATH}`,
                filename: fileName,
            }),
            fileFilter: datafileFilter,
        }),
        AccessGuard
    )
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailCampaignRequestsInput, @UploadedFile() file: Express.Multer.File) {
        let tempCsvPathForCleanup = null;
        let jsonPathForCleanup = null;
        try {
            
            if ((!postData.for_org_id || postData.for_org_id === 0) && postData?.organization) {
                const org = typeof postData.organization === 'string' ? (() => { try { return JSON.parse(postData.organization); } catch { return null; } })() : postData.organization;
                if (org && (org.id || org.for_org_id)) {
                    postData.for_org_id = org.id || org.for_org_id;
                }
            }
            if (!postData?.with_option || !postData?.campaign_title) {
                if (
                    postData?.with_option === '0' &&
                    file &&
                    file.fieldname === 'file' &&
                    file.filename
                ) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            /* with_option 0: file + organization required */
            if(postData?.with_option === '0' && (!file || !postData?.for_org_id)){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }else if(postData?.with_option === '1' && !postData?.for_org_id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }else if(postData?.with_option === '2' && (!postData?.group_id || !postData?.use_def_tem_id)){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let dtempID = 0;
            if (postData?.use_def_tem_id && postData?.use_def_tem_id !== null && postData?.use_def_tem_id !== undefined) {
                dtempID = postData?.use_def_tem_id || 0;
            }
            /* WITH OPTION 0 */
                if(postData?.with_option === '0'){
                    if(file && typeof file !== undefined && file.fieldname === 'file' && file.filename && file.originalname && file.originalname != ''){
                  
                        const fileExt = pathInfo.extname(file.originalname).toLowerCase();
                        let sheetData = [];
                        if (fileExt === '.csv') {
                            sheetData = await this.csvService.readCsv(file.path);
                        } else if (fileExt === '.xlsx' || fileExt === '.xls') {
                            const jsonFileName = await this.commonFileService.createFileToJson(file.path, 'excel_to_json.py', req);
                            if (jsonFileName && jsonFileName['status'] === 1) {
                                const jsonPath = file.path.replace(fileExt, '.json');
                                jsonPathForCleanup = jsonPath;
                                sheetData = await this.commonFileService.readFile(jsonPath);
                            }
                        }
                      
                        let sheetTotalData = sheetData.length;
                        if(sheetTotalData > 1){
                            if(sheetTotalData <= 2001){
                                let headerData = sheetData[0];
                                let MainheaderData = sheetData[0];
                                sheetData = sheetData.slice(1);
                                sheetTotalData = sheetData.length;
                                headerData = headerData.map(item => item.toLowerCase().trim());
                                if(!headerData.find(item => item.toLowerCase() === 'email')){
                                    throw new Error('Email column is missing in the file.');
                                } 
                                const emailKey = headerData.indexOf('email');
                                let sheetEamilArray = sheetData.map(innerArray => innerArray[emailKey]);
                                sheetEamilArray = sheetEamilArray.filter(value => value.trim() !== '');
                                const totalSheetEmails = sheetEamilArray.length;
                                const testUserData = sheetData[0];
                                if(headerData.length !== 0){
                                    if(sheetTotalData !== totalSheetEmails){
                                        throw new Error('All contacts in email value is required. Some Contact in email value is missing.');
                                    }else{
                                        if (fileExt === '.xlsx' || fileExt === '.xls') {
                                            await this.commonFileService.dirIsExist(`${appConstant.COMUNICATION_CAMPAIGN_FILE_TEMP_PATH}`);
                                            const jsonPath = file.path.replace(fileExt, '.json');
                                            const excelData: any = await this.commonFileService.createJsonToFile(1, jsonPath, 'pythoncreatecsv.py');
                                            if (excelData?.status === 'success') {
                                                const tempCsvPath = jsonPath.replace('.json', '.csv');
                                                tempCsvPathForCleanup = tempCsvPath;
                                                postData.file = tempCsvPath;
                                                await this.commonFileService.removeFileFromLocal(jsonPath);
                                                jsonPathForCleanup = null;
                                            } else {
                                                throw new Error('Failed to convert file to CSV.');
                                            }
                                        } else {
                                            postData.file = file.path;
                                        }
                                        postData.sheet_header = JSON.stringify(MainheaderData);
                                        postData.test_mail_user_data = JSON.stringify(testUserData);
                                       
                                    }
                                }else{
                                    throw new Error('Data not found.');
                                }
                            }else{
                                throw new Error('No. of contacts must be less than or equal to 2000 contacts.');
                            }
                        }else{
                            throw new Error('Data not found.');
                        }
                    }else{
                        throw new Error('Please select a contact file.');
                    }
                }
            /* WITH OPTION 0 */
            /* WITH OPTION 1 */
                if(postData?.with_option === '1'){ 
                    postData.sheet_header = '["ID","First Name","Last Name","Email","Gender","Health Plan","User Code","User Name","Status","Role","Organization Name","Department","Location","Subscribe"]';
                    let DepartmentArr = [];
                    if(req?.body?.department && typeof req?.body?.department === 'string'){
                        DepartmentArr = req?.body?.department?.split(',');
                        DepartmentArr = DepartmentArr.map(item => `"${item}"`);
                    }
                    let LocationArr = [];
                    if(req?.body?.location && typeof req?.body?.location === 'string'){
                        LocationArr = req?.body?.location.split(',');
                        LocationArr = LocationArr.map(item => `"${item}"`);
                    }
                    let HealthPlanNameArr = [];
                    if(req?.body?.health_plan_name && typeof req?.body?.health_plan_name === 'string'){
                        HealthPlanNameArr = req?.body?.health_plan_name.split(',');
                        HealthPlanNameArr = HealthPlanNameArr.map(item => `"${item}"`);
                    }
                    const orgFilertDatas = {
                        department : (DepartmentArr.length > 0 ? DepartmentArr : ""),
                        location : (LocationArr.length > 0 ? LocationArr : ""),
                        on_health_plan : (req.body.on_health_plan && req.body.on_health_plan !== null && req.body.on_health_plan !== undefined) ? req.body.on_health_plan : "2",
                        health_plan_name : (HealthPlanNameArr.length > 0 ? HealthPlanNameArr : ""),
                        gender : (req.body.gender && req.body.gender !== null && req.body.gender !== undefined) ? req.body.gender : "all",
                        terminated : (req.body.terminated && req.body.terminated !== null && req.body.terminated !== undefined) ? req.body.terminated : "0",
                        eligibility : (req.body.eligibility && req.body.eligibility !== null && req.body.eligibility !== undefined) ? req.body.eligibility : "7",
                    };


                    // First, try to find a user strictly matching all filters
                    let getTestUser = await this.userFileterData('testUser', postData?.for_org_id, orgFilertDatas);

                    // If no user is found, relax filters and try again so that creation doesn't always fail
                    if(!getTestUser || getTestUser === null || getTestUser === undefined || (Array.isArray(getTestUser) && getTestUser.length === 0) || (typeof getTestUser === 'object' && Object.keys(getTestUser).length === 0)){
                        const relaxedFilter = {
                            department : "",
                            location : "",
                            on_health_plan : "2",
                            health_plan_name : "",
                            gender : "all",
                            terminated : (req.body.terminated && req.body.terminated !== null && req.body.terminated !== undefined) ? req.body.terminated : "0",
                            // eligibility ko empty rakhne se userFileterData me default role_id IN (2,16) use hoga
                            eligibility : "",
                        };
                        getTestUser = await this.userFileterData('testUser', postData?.for_org_id, relaxedFilter);
                    }

                    // Agar relaxed filter ke baad bhi user nahi mila to hi error throw kare
                    if(!getTestUser || getTestUser === null || getTestUser === undefined || (Array.isArray(getTestUser) && getTestUser.length === 0) || (typeof getTestUser === 'object' && Object.keys(getTestUser).length === 0)){
                        throw new Error('Your filter according user not found.');
                    }

                    getTestUser = await this.convertToIndexedObject(getTestUser);
                    if(!getTestUser || !getTestUser[0] || !getTestUser[9]){
                        throw new Error('Your filter according user not found.');
                    }
                    postData.test_mail_user_data = JSON.stringify(getTestUser);
                    postData.org_filter_data = JSON.stringify(orgFilertDatas).replace(/\\\"/g, '');
                    postData.test_user_role = getTestUser[9]; /* USER ROLE */
                    postData.test_user_id = getTestUser[0]; /* USER ID */
                }
            /* WITH OPTION 1 */
            /* WITH OPTION 2 */
                let OrgUserList = [];
                let GroupsorgIds = null;
                if(postData?.with_option === '2'){
                    const group_id = postData?.group_id;
                    postData.use_def_tem_id = 0;
                    postData.template_type = 0;
                    postData.details_type = 0;
                    if(group_id && group_id !== null && group_id !== undefined){
                        const groupData = await lastValueFrom(this.client.send({ cmd: 'get_one_email_groups' }, { id: group_id}));
                        if(groupData && groupData !== null && groupData !== undefined){
                            if(groupData.orgs_ids !== null && groupData.orgs_ids !== undefined){
                                GroupsorgIds = JSON.parse(groupData.orgs_ids);
                                const GroupsorgCodes = Object.keys(GroupsorgIds);
                                if(GroupsorgCodes.length > 0){
                                    OrgUserList = await this.userFileterData('GroupTestUser', GroupsorgCodes);
                                    if(OrgUserList && OrgUserList !== null && OrgUserList !== undefined && OrgUserList.length != GroupsorgCodes.length){
                                        throw new Error('Sorry! This group in some organization in user not found.');
                                    }else{
                                        OrgUserList = OrgUserList.reduce((acc, obj) => {
                                            const { company_code, ...rest } = obj; // Destructure to remove company_code and get the rest of the object
                                            if (!acc[company_code]) {
                                                acc[company_code] = [];
                                            }
                                            acc[company_code].push(rest);
                                            return acc;
                                            }, {});
                                    }
                                }else{
                                    throw new Error('Sorry! This group in not selected any organization.');
                                }
                            }else{
                                throw new Error('Sorry! This group in not selected any organization.');
                            }
                        }else{
                            throw new Error('Your selected group not exist.');
                        }
                    }else{
                        throw new Error('Sorry! You have not select a group.');
                    }
                }
            /* WITH OPTION 2 */
            postData.status = 1;
            postData.request_status = 4;
            let resMessage = '';
            let lastInsertId = 0;
            let lastInsertHash = '';
            let resData = {};
            let dtempData = null;
            if(postData?.with_option === '2' && dtempID !== 0){
                dtempData = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_templates' }, { id: dtempID}));
                if(typeof dtempData !== undefined && dtempData === null){
                    throw new Error('Sorry! Your selected default template not found.');
                }
            }
            postData.created_by = req.tokenUser?.id;
            postData.role_id = req.tokenUser?.role_id;
            const campaignDatas = await lastValueFrom(this.client.send({ cmd: 'create_campaign_requests' }, postData));
            if(campaignDatas && campaignDatas !== null && campaignDatas !== undefined && campaignDatas['identifiers'] && campaignDatas['identifiers'].length > 0){
                lastInsertId = campaignDatas['identifiers'][0]['id'];
                lastInsertHash = `${this.commonService.generateMD5(lastInsertId.toString())}`;
                let updateData = {
                    id: lastInsertId,
                    hash: lastInsertHash
                };
                /* WITH OPTION 0 */
                    if(postData?.with_option === '0' && file && file.fieldname === 'file' && file.filename){
                        const fileExt = pathInfo.extname(file.originalname).toLowerCase();
                        const saveExt = (fileExt === '.xlsx' || fileExt === '.xls') ? '.csv' : fileExt;
                        await this.commonFileService.copyFiles(postData?.file, `${appConstant.COMUNICATION_CAMPAIGN_FILE_PATH}/${lastInsertId}`,`${lastInsertHash}${saveExt}`);
                        updateData['file'] = `${lastInsertHash}${saveExt}`;
                        if (tempCsvPathForCleanup) {
                            await this.commonFileService.removeFileFromLocal(tempCsvPathForCleanup);
                        }
                        if (jsonPathForCleanup) {
                            await this.commonFileService.removeFileFromLocal(jsonPathForCleanup);
                        }
                        if (file.path && (fileExt === '.xlsx' || fileExt === '.xls')) {
                            await this.commonFileService.removeFileFromLocal(file.path);
                        }
                    }
                /* WITH OPTION 0 */
                /* WITH OPTION 2 */
                    if(postData?.with_option === '2' && dtempID !== 0){
                        let Ocampaign_title = '';
                        if(postData?.campaign_title){
                            Ocampaign_title = postData?.campaign_title;
                        }
                        let Otemplate_content = null;
                        let Osubject = null;
                        let Ouse_def_tem_id = 0;
                        let Otemplate_type = 0;
                        let Odetails_type = 0;
                        if(typeof dtempData !== undefined && dtempData !== null){
                            Otemplate_content = dtempData['template_content'];
                            Osubject = dtempData['subject'];
                            Ouse_def_tem_id = dtempID;
                            Otemplate_type = dtempData['temp_type'];
                            Odetails_type = dtempData['details_type'];
                        }
                        let GOrgCamScheMDefault = {
                            'campaign_title': Ocampaign_title,
                            'created_by': req.tokenUser?.id,
                            'role_id': postData?.role_id,
                            'with_option': postData?.with_option,
                            'group_id': postData?.group_id,
                            'sheet_header': '["ID","First Name","Last Name","Email","Gender","Health Plan","User Code","User Name","Status","Role","Organization Name","Department","Location","Subscribe"]',
                            'parent_id': lastInsertId,
                            'template_content': Otemplate_content,
                            'subject': Osubject,
                            'use_def_tem_id': Ouse_def_tem_id,
                            'template_type': Otemplate_type,
                            'details_type': Odetails_type,
                            'status': 1,
                            'request_status': 4
                        };
                        let GOrgCamScheMDefaultArray = [];
                        for (let key in GroupsorgIds) {
                            if (GroupsorgIds.hasOwnProperty(key)) {
                                let orgCode = key;
                                let orgId = GroupsorgIds[key];
                                let OrgTestUser = OrgUserList[orgCode];
                                OrgTestUser = await this.convertToIndexedObject(OrgTestUser[0]);
                                let GOrgCamScheMDefaultCopy = { ...GOrgCamScheMDefault };
                                GOrgCamScheMDefaultCopy['test_mail_user_data'] = JSON.stringify(OrgTestUser);
                                GOrgCamScheMDefaultCopy['test_user_role'] = OrgTestUser[9]; /* USER ROLE */
                                GOrgCamScheMDefaultCopy['test_user_id'] = OrgTestUser[0];   /* USER ID */
                                GOrgCamScheMDefaultCopy['for_org_id'] = orgId;
                                const subReqHash = orgId+'_'+lastInsertId;
                                GOrgCamScheMDefaultCopy['hash'] = `${this.commonService.generateMD5(subReqHash.toString())}`;
                                GOrgCamScheMDefaultArray.push(GOrgCamScheMDefaultCopy);    
                            }
                        }
                        let subCampaignDatas = await lastValueFrom(this.client.send({ cmd: 'create_campaign_requests' }, GOrgCamScheMDefaultArray));
                    }
                /* WITH OPTION 2 */
                if(updateData){
                    await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, updateData));
                }
                resData = {id: lastInsertId, hash: lastInsertHash,};
                resMessage = 'Request created successfully.';
            }else{
                resMessage = 'Somthing went wrong....';
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: resData,
                message: resMessage,
            });
        } catch (error) {
            if (
                postData?.with_option === '0' &&
                file &&
                file.fieldname === 'file' &&
                file.filename
            ) {
                if (tempCsvPathForCleanup) {
                    await this.commonFileService.removeFileFromLocal(tempCsvPathForCleanup);
                }
                if (jsonPathForCleanup) {
                    await this.commonFileService.removeFileFromLocal(jsonPathForCleanup);
                }
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
    @Post('step-two')
    @UseInterceptors(
        FilesInterceptor('attachaments', 3, {
            limits: { fileSize: appConstant.FILE_SIZE_10MB, files: 3},
            storage: diskStorage({
                destination: `${appConstant.COMUNICATION_CAMPAIGN_FILE_TEMP_PATH}`,
                filename: fileName,
            }),
            fileFilter: attachmentFileFilter,
        }),
        AccessGuard
    )
    async stepTwo(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailCampaignRequestsInput, @UploadedFiles() file: Express.Multer.File) {
        try {
            /* organization object se for_org_id extract - draft save ke time */
            if ((!postData.for_org_id || postData.for_org_id === 0) && postData?.organization) {
                const org = typeof postData.organization === 'string' ? (() => { try { return JSON.parse(postData.organization); } catch { return null; } })() : postData.organization;
                if (org && (org.id || org.for_org_id)) {
                    postData.for_org_id = org.id || org.for_org_id;
                }
            }
            if (!postData?.id && !postData?.hash) {
                if (file && Object.keys(file).length > 0) {
                    const imageKeys = Object.keys(file);
                    let i = 0;
                    while (i < imageKeys.length) {
                        const key = imageKeys[i];
                        await this.commonFileService.removeFileFromLocal(`${file[key].path}`);
                        i++;
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const loged_role_id = req.tokenUser?.role_id;
            const loged_user_id = req.tokenUser?.id;
            const loged_user_name = req.tokenUser?.first_name + ' ' + req.tokenUser?.last_name;
            let inProgressCheck = {};
            let getCampaignDetails = null;
            if(postData?.id && postData?.hash){
                inProgressCheck = await lastValueFrom(this.client.send({ cmd: 'check_campaign_datas' }, [postData, 'firstCheck']));
                getCampaignDetails = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, {id : postData?.id, hash : postData?.hash}));
            }
            if(postData?.id && postData?.hash && getCampaignDetails !== null && getCampaignDetails !== undefined){
                if(inProgressCheck['pendingCampaign'] !== '0' || inProgressCheck['draftCampaign'] !== '0' || inProgressCheck['pausedCampaign'] !== '0' || inProgressCheck['resumeCampaign'] !== '0'){
                    const loged_role_id = req.tokenUser?.role_id;
                    let loged_org_id = 0;
                    let campRoleIdArr = [];
                    if(loged_role_id == 40){
                        campRoleIdArr = [loged_role_id];
                    }else if(loged_role_id == 39){
                        campRoleIdArr = [loged_role_id,40,11];
                    }else if(loged_role_id == 39){
                        campRoleIdArr = [loged_role_id,40,39,11];
                    }else {
                        loged_org_id = req.tokenUser?.org_id;
                        campRoleIdArr = [loged_role_id,38,39];
                    }
                    let accessStatus = 1;
                    if(inProgressCheck['checkCampaign'] !== 0){
                        const cam_role_id = getCampaignDetails['role_id'];
                        const cam_org_id = getCampaignDetails['for_org_id'];
                        if(campRoleIdArr.includes(cam_role_id)){
                            accessStatus = 0;
                            if(loged_role_id == 11 && loged_org_id != cam_org_id){ accessStatus = 1;}
                        }
                    }
                    if(accessStatus == 0){
                        const CampId = postData?.id;
                        const CampHash = postData?.hash;
                        const exit_schedule_datetime = getCampaignDetails['schedule_datetime'];
                        const exit_schedule_timezone = getCampaignDetails['timezone'];
                        const exit_approval_status = getCampaignDetails['approval_status'];
                        const exit_approval_status_json = getCampaignDetails['approval_status_data'];
                        let actionType = '';
                        if(req.body.actionType !== undefined){
                            actionType = req.body.actionType;
                        }
                        let nextprevHash = '';
                        if(req.body.nextprevHash !== undefined){
                            nextprevHash = req.body.nextprevHash;
                        }
                        let currentCampHash = '';
                        if(req.body.currentCampHash !== undefined){
                            currentCampHash = req.body.currentCampHash;
                        }
                        let GetSubCampaignDetails = null;
                        let currentSubCampID = 0;
                        if(getCampaignDetails['with_option'] == '2' && getCampaignDetails['group_id'] != 0 && currentCampHash != '' && currentCampHash != null && currentCampHash != undefined){
                            GetSubCampaignDetails = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, {hash : currentCampHash}));
                            currentSubCampID = GetSubCampaignDetails['id'];
                        }
                        let approvalStatusJson = null;
                        if(exit_approval_status == 0 && (exit_approval_status_json === null || exit_approval_status_json === '') && actionType == '2'){
                            if(loged_role_id == 38 || loged_role_id == 11){
                                approvalStatusJson =
                                    {
                                        campaign_name : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                        user_sheet : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                        from_email : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                        subject : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                        mail_content : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                        attchament : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                        send_test_mail : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                        schedule_datetime : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                        timezone : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` }
                                    }
                                postData.approval_status = 2;
                            }else if(loged_role_id == 39){
                                if(getCampaignDetails && getCampaignDetails['sendtestmailstatus'] == 1){
                                    approvalStatusJson = 
                                        {
                                            campaign_name : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                            user_sheet : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                            from_email : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                            subject : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                            mail_content : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                            attchament : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                            send_test_mail : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                            schedule_datetime : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` },
                                            timezone : { status : '2', datetime : `${ await this.getCurrentDateTime()}`, ad_user_id : `${loged_user_id}`, ad_user_name : `${loged_user_name}` }
                                        }
                                    postData.approval_status = 2;
                                }
                            }
                            postData.approval_status_data = (approvalStatusJson && typeof approvalStatusJson === 'object' && approvalStatusJson !== null) ? JSON.stringify(approvalStatusJson) : '';
                        }else{
                            postData.approval_status = 0;
                            if(getCampaignDetails['with_option'] != '2' && getCampaignDetails['sendtestmailstatus'] == 1 && exit_approval_status == 2 && exit_approval_status_json != ''){
                                postData.approval_status = 2;
                            }else if(getCampaignDetails['with_option'] == '2'){
                                postData.approval_status = 2;
                            }
                        }
                        /* DATE TIME CONVERSTION */
                            if(!postData?.timezone){
                                postData.timezone = exit_schedule_timezone;
                            }
                            if(!postData?.schedule_datetime){
                                postData.schedule_datetime = exit_schedule_datetime;
                            }
                        /* DATE TIME CONVERSTION */  
                        if(getCampaignDetails['with_option'] == '2' && getCampaignDetails['group_id'] != 0){
                            if(actionType == '1'){
                                postData.request_status = 4;
                                postData.approval_status = 0;
                                postData.approval_status_data = '';
                            }else if(actionType == '3' || actionType == '4'){
                                postData.request_status = getCampaignDetails['request_status'];
                                postData.approval_status = getCampaignDetails['approval_status'];
                                postData.approval_status_data = getCampaignDetails['approval_status_data'];
                            }else{
                                postData.request_status = 0;
                            }
                        }else{
                            if(actionType == '1'){
                                postData.request_status = 4;
                                postData.approval_status = 0;
                                postData.approval_status_data = '';
                            }else{
                                postData.request_status = 0;
                            }
                        }
                        /* ATTACHMENT FILE MOVE */
                            let attcArray = [];
                            if (file && Object.keys(file).length > 0) {
                                let attcDestinationPath = '';
                                if(getCampaignDetails['with_option'] == '2' && getCampaignDetails['group_id'] != 0){
                                    attcDestinationPath = `${appConstant.COMUNICATION_CAMPAIGN_FILE_PATH}/${postData?.id}/${currentSubCampID}`;
                                }else{
                                    attcDestinationPath = `${appConstant.COMUNICATION_CAMPAIGN_FILE_PATH}/${postData?.id}`;
                                }
                                const imageKeys = Object.keys(file);
                                let i = 0;
                                while (i < imageKeys.length) {
                                    const key = imageKeys[i];
                                    const newFileName = file[key].originalname.replace(/[^a-zA-Z0-9.]/g, '');
                                    await this.commonFileService.copyFiles(file[key].path, attcDestinationPath, newFileName);
                                    attcArray.push(`${newFileName}`);
                                    i++;
                                }
                            }

                            if (attcArray.length > 0) {
                                postData.attachment = JSON.stringify(attcArray);
                            } else {
                                delete postData.attachment;
                            }
                        /* ATTACHMENT FILE MOVE */
                            if(getCampaignDetails['with_option'] == '2' && getCampaignDetails['group_id'] != 0 && currentCampHash != '' && currentCampHash != null && currentCampHash != undefined){
                                postData.id = currentSubCampID;
                                postData.hash = currentCampHash;
                            }
                            if(postData?.template_type == 4 && postData?.template_item_id !== null && postData?.template_item_id !== undefined && postData?.template_item_id != ''){
                                postData.template_item_sub_id = (postData?.template_item_sub_id !== null && postData?.template_item_sub_id !== undefined && postData?.template_item_sub_id != '') ? postData?.template_item_sub_id : null;
                            }else{
                                postData.template_item_sub_id = null;
                            }
                            postData.template_item_id = (postData?.template_item_id !== null && postData?.template_item_id !== undefined && postData?.template_item_id != '') ? postData?.template_item_id : 0;
                            let inProgressCheckSecond = {};
                            if(postData?.id && postData?.hash){
                                inProgressCheckSecond = await lastValueFrom(this.client.send({ cmd: 'check_campaign_datas' }, [postData, 'secondCheck']));
                            }
                            let inProgressStatus = 0;
                            if(postData?.id && postData?.hash && (inProgressCheckSecond['pendingCampaign'] !== '0' || inProgressCheckSecond['draftCampaign'] !== '0' || inProgressCheckSecond['pausedCampaign'] !== '0' || inProgressCheckSecond['resumeCampaign'] !== '0')){
                                inProgressStatus = 1;
                            }
                            let resMessage = '';
                            if(inProgressStatus == 0){
                                postData.updated_by = req.tokenUser?.id;
                                const campaignDatas = await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, postData));
                                if(campaignDatas && campaignDatas !== null && campaignDatas !== undefined){
                                    /* WITH OPTION 2 */
                                    if(getCampaignDetails['with_option'] == '2' && getCampaignDetails['group_id'] !== 0){
                                        let getAllSubRequest = await lastValueFrom(this.client.send({ cmd: 'get_all_group_campaign_requests' }, {parent_id : CampId}));
                                        getAllSubRequest = <any>(await this.commonArrayService.formatToDto(CommunicationEmailCampaignRequestsDto, getAllSubRequest, req.lang));
                                        const SubsubjectArray = Object.values(getAllSubRequest).map(item => item['subject']);
                                        const SubTestemailArray = Object.values(getAllSubRequest).map(item => item['testemail']);
                                        const SubSendtestmailstatusArray = Object.values(getAllSubRequest).map(item => item['sendtestmailstatus']);
                                        let GroupCampError = [];
                                        if(getAllSubRequest.length != SubsubjectArray.length){
                                            GroupCampError.push("Enter a subject for all organization");
                                        }
                                        if(getAllSubRequest.length != SubTestemailArray.length){
                                            GroupCampError.push("Enter a test email for all organization");
                                        }
                                        if(getAllSubRequest.length != SubSendtestmailstatusArray.length){
                                            GroupCampError.push("Please send a test mail");
                                        }
                                        if(GroupCampError.length > 0){
                                            let GroupCampErrorString = GroupCampError.join(', ');
                                            throw new Error(GroupCampErrorString);
                                        }else{
                                            postData.request_status = 0;
                                            if(actionType === '1'){
                                                postData.request_status = 4;
                                            }
                                            postData.id = getCampaignDetails['id'];
                                            postData.hash = getCampaignDetails['hash'];
                                            delete(postData?.subject);
                                            delete(postData?.template_content);
                                            delete(postData?.testemail);
                                            delete(postData?.attachment);
                                            delete(postData?.use_def_tem_id);
                                            delete(postData?.template_item_id);
                                            delete(postData?.template_type);
                                            delete(postData?.details_type);
                                            delete(postData?.template_item_sub_id);
                                            const UpdateMainCampaignDatas = await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, postData));
                                            if(UpdateMainCampaignDatas && UpdateMainCampaignDatas !== null && UpdateMainCampaignDatas !== undefined){
                                                const SubCampaignIDS = Object.values(getAllSubRequest).map(item => item['id']);
                                                let CommonSubCampUdateData = {};
                                                CommonSubCampUdateData['from_email_id'] = postData?.from_email_id;
                                                CommonSubCampUdateData['schedule_datetime'] = postData?.schedule_datetime;
                                                CommonSubCampUdateData['timezone'] = postData?.timezone;
                                                CommonSubCampUdateData['schedule_utc_datetime'] = (postData?.schedule_utc_datetime && postData?.schedule_utc_datetime !== null && postData?.schedule_utc_datetime !== undefined) ? postData?.schedule_utc_datetime : null;
                                                CommonSubCampUdateData['request_status'] = postData?.request_status;
                                                CommonSubCampUdateData['updated_by'] = postData?.updated_by;
                                                if(postData?.approval_status && postData?.approval_status !== null && postData?.approval_status !== undefined){
                                                    CommonSubCampUdateData['approval_status'] = postData?.approval_status;
                                                }
                                                if(postData?.approval_status_data && postData?.approval_status_data !== null && postData?.approval_status_data !== undefined){
                                                    CommonSubCampUdateData['approval_status_data'] = postData?.approval_status_data;
                                                }
                                                postData['updatedIDs'] = SubCampaignIDS;
                                                const UpdateSubCampaignDatas = await lastValueFrom(this.client.send({ cmd: 'update_multiple_campaign_requests' }, postData));
                                            }
                                        }
                                    }
                                /* WITH OPTION 2 */
                                }
                                if(actionType === '2'){
                                    resMessage = 'Campaign saved successfully.';
                                }else if(actionType === '1'){
                                    resMessage = 'Campaign saved as drafed successfully.';
                                }else{
                                    resMessage = 'success';
                                }
                            }else{
                                resMessage = 'Sorry! Request go to in-progress.';
                            }
                            return res.status(HttpStatus.CREATED).json({
                                statusCode: 201,
                                success: 1,
                                error: 0,
                                data: [],
                                message: resMessage,
                            });
                    }else{
                        throw new Error('Sorry! You are not authorized to access this campaign.');
                    }
                }else{
                    if(postData?.id && postData?.hash && inProgressCheck['checkCampaign'] === 0){
                        throw new Error('Sorry! Campaign is not found.');
                    }else{
                        throw new Error('Sorry! Request go to in-progress.');
                    }
                }
            }else{
                throw new Error('Sorry! Campaign is not found.');
            }
        } catch (error) {
            if (file && Object.keys(file).length > 0) {
                const imageKeys = Object.keys(file);
                let i = 0;
                while (i < imageKeys.length) {
                    const key = imageKeys[i];
                    await this.commonFileService.removeFileFromLocal(`${file[key].path}`);
                    i++; 
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
    @Post('send-test-mail')
    @UseInterceptors(
        FilesInterceptor('attachaments', 3, {
            limits: { fileSize: appConstant.FILE_SIZE_10MB, files: 3},
            storage: diskStorage({
                destination: `${appConstant.COMUNICATION_CAMPAIGN_FILE_TEMP_PATH}`,
                filename: fileName,
            }),
            fileFilter: attachmentFileFilter,
        }),
        AccessGuard
    )
    async sendTestMail(@Req() req: Request, @Res() res: Response, @Body() postData: any, @UploadedFiles() files: Express.Multer.File[]) {
        try {
            if (!postData?.id || !postData?.hash || !postData?.testemail) {
                if (files && files.length > 0) {
                    for (const file of files) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }

            const loged_role_id = req.tokenUser?.role_id;
            const loged_user_id = req.tokenUser?.id;
            const loged_org_id = req.tokenUser?.org_id;
            const loged_user_name = req.tokenUser?.first_name + ' ' + req.tokenUser?.last_name;
            const currentID = postData?.currentID || '';
            const cmpid = postData?.id;
            const cam_hash = postData?.hash;
            const tomail = postData?.testemail;

            let campRoleIdArr = [];
            if(loged_role_id == 40){
                campRoleIdArr = [loged_role_id];
            }else if(loged_role_id == 39){
                campRoleIdArr = [loged_role_id,40,11];
            }else if(loged_role_id == 38){
                campRoleIdArr = [loged_role_id,40,39,11];
            }else if(loged_role_id == 11){
                campRoleIdArr = [loged_role_id,38,39];
            }
            let CheckRequest = null;
            if(currentID === ''){
                CheckRequest = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, {id: cmpid, hash: cam_hash}));
            }else{
                CheckRequest = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, {parent_id: cmpid, hash: currentID}));
            }
            if(!CheckRequest){
                if (files && files.length > 0) {
                    for (const file of files) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }

            const cam_role_id = CheckRequest['role_id'];
            const cam_org_id = CheckRequest['for_org_id'];
            const withOption = CheckRequest['with_option'];

            let accessStatus = 0;
            if(!campRoleIdArr.includes(cam_role_id) || (loged_role_id == 11 && cam_org_id != loged_org_id)){ accessStatus = 1; }

            if(accessStatus == 1){
                if (files && files.length > 0) {
                    for (const file of files) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                }
                throw new Error('Sorry! You are not authorized to access this campaign.');
            }

            const frommail = postData?.from_email_id || CheckRequest['from_email_id'];
            const content = postData?.template_content || CheckRequest['template_content'];
            const subject = postData?.subject || CheckRequest['subject'];

            let ItemDetails = null;
            if(postData?.cam_org_id && postData?.cam_org_id != 0 && [1,2].includes(parseInt(withOption))){
                if(postData?.template_type == 5){
                    ItemDetails = await this.getQuizDetails(postData?.template_item_id, postData?.cam_org_id);
                }else if(postData?.template_type == 6){
                    ItemDetails = await this.getEventDetails(postData?.template_item_id, postData?.cam_org_id);
                }else if(postData?.template_type == 7 || postData?.template_type == 3){
                    ItemDetails = await this.getChallengeDetails(postData?.template_item_id, postData?.cam_org_id);
                }else if(postData?.template_type == 4){
                    const userDatas = JSON.parse(CheckRequest['test_mail_user_data']);
                    const userIds = [userDatas[0]];
                    if(postData?.details_type == 0 || postData?.details_type == 1){
                        ItemDetails = await this.getCampaignDetails(postData?.template_item_id, postData?.cam_org_id, postData?.details_type, postData?.template_item_sub_id, CheckRequest['test_user_role'], userIds);
                    }else{
                        ItemDetails = await this.getCampaignRanking(postData?.template_item_id, postData?.cam_org_id);
                    }
                }
            }

            const path = require('path');
            const fs = require('fs');

            let attachmentarray = [];
            if(files && files.length > 0){
                for(const att of files){
                    if(att && att.path){
                        const absolutePath = path.resolve(att.path);

                        if(!fs.existsSync(absolutePath)){
                            throw new Error(`Attachment file not found at: ${absolutePath}`);
                        }

                        attachmentarray.push({
                            filename: att.originalname,
                            path: absolutePath,
                        });
                    }
                }
            }

            let already_exit_file_array = [];
            if(postData?.selectedattchementfile && Array.isArray(postData?.selectedattchementfile)){
                for(const erow of postData?.selectedattchementfile){
                    const fileName = erow.split('/').pop();
                    const filedata = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file_from_bucket'}, {prefix: erow}));

                    if(filedata && filedata.Body){
                        const tempFilePath = path.resolve(appConstant.COMUNICATION_CAMPAIGN_FILE_TEMP_PATH, `temp_${Date.now()}_${fileName}`);

                        fs.writeFileSync(tempFilePath, filedata.Body);

                        already_exit_file_array.push({
                            filename: fileName,
                            path: tempFilePath,
                        });
                    }
                }
            }

            const attachmentFiles = [...already_exit_file_array, ...attachmentarray];

            const GetFromEmail = await lastValueFrom(this.client.send({ cmd: 'get_one_email_configs' }, {id: frommail}));

            let FromName = 'Prevention Cloud';
            let FromEmail = 'notifications@preventioncloud.com';

            if(GetFromEmail){
                const firstName = GetFromEmail['first_name'] || '';
                const lastName = GetFromEmail['last_name'] || '';
                FromName = (firstName + ' ' + lastName).trim() || 'Prevention Cloud';
                FromEmail = GetFromEmail['email'] || 'notifications@preventioncloud.com';
            }

            const Templatetext = {
                map_header: CheckRequest['sheet_header'],
                test_user_data: CheckRequest['test_mail_user_data'],
                UnsubscribeLink: `${process.env.FRONTEND_URL}/users/users/unsubscribe/${Buffer.from(tomail).toString('base64')}`,
                ItemDetails: ItemDetails
            };

            const emailRegex = /^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,3})$/i;
            if(!tomail || !emailRegex.test(tomail.toLowerCase()) || tomail.includes('@preventioncloud.com')){
                if (files && files.length > 0) {
                    for (const file of files) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                }
                throw new Error('Invalid email address or preventioncloud.com email not allowed.');
            }

            const setEmailTemplete = await this.emailContentSet(Templatetext, content);

            try{
                let emaildata = {
                    sender: FromEmail,
                    receiver: tomail,
                    subject: subject,
                    content: ``,
                    template: setEmailTemplete,
                    attachment: attachmentFiles,
                }
                const emailResponse = await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emaildata));
                /*if(response && response.success){*/
                    let RequestData: any = {};

                    if(CheckRequest['role_id'] == 39){
                        const approvalStatusJson = {
                            campaign_name: {status: '2', datetime: await this.getCurrentDateTime(), ad_user_id: loged_user_id.toString(), ad_user_name: loged_user_name},
                            user_sheet: {status: '2', datetime: await this.getCurrentDateTime(), ad_user_id: loged_user_id.toString(), ad_user_name: loged_user_name},
                            from_email: {status: '2', datetime: await this.getCurrentDateTime(), ad_user_id: loged_user_id.toString(), ad_user_name: loged_user_name},
                            subject: {status: '2', datetime: await this.getCurrentDateTime(), ad_user_id: loged_user_id.toString(), ad_user_name: loged_user_name},
                            mail_content: {status: '2', datetime: await this.getCurrentDateTime(), ad_user_id: loged_user_id.toString(), ad_user_name: loged_user_name},
                            attchament: {status: '2', datetime: await this.getCurrentDateTime(), ad_user_id: loged_user_id.toString(), ad_user_name: loged_user_name},
                            send_test_mail: {status: '2', datetime: await this.getCurrentDateTime(), ad_user_id: loged_user_id.toString(), ad_user_name: loged_user_name},
                            schedule_datetime: {status: '2', datetime: await this.getCurrentDateTime(), ad_user_id: loged_user_id.toString(), ad_user_name: loged_user_name},
                            timezone: {status: '2', datetime: await this.getCurrentDateTime(), ad_user_id: loged_user_id.toString(), ad_user_name: loged_user_name}
                        };
                        RequestData['approval_status'] = 2;
                        RequestData['approval_status_data'] = JSON.stringify(approvalStatusJson);
                    }

                    if(currentID === ''){
                        RequestData['id'] = cmpid;
                        RequestData['hash'] = cam_hash;
                    }else{
                        RequestData['id'] = CheckRequest['id'];
                        RequestData['parent_id'] = cmpid;
                        RequestData['hash'] = currentID;
                    }

                    RequestData['subject'] = subject;
                    RequestData['template_content'] = content;
                    RequestData['template_item_id'] = postData?.template_item_id || 0;
                    RequestData['template_type'] = postData?.template_type || 0;
                    RequestData['details_type'] = postData?.details_type || 0;
                    RequestData['testemail'] = tomail;
                    RequestData['sendtestmailstatus'] = 1;
                    RequestData['use_def_tem_id'] = postData?.use_def_tem_id || 0;
                    RequestData['from_email_id'] = frommail;

                    if(postData?.template_type == 4 && postData?.template_item_id){
                        RequestData['template_item_sub_id'] = Array.isArray(postData?.template_item_sub_id) ? postData?.template_item_sub_id.join(',') : postData?.template_item_sub_id;
                    }else{
                        RequestData['template_item_sub_id'] = null;
                    }

                    await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, RequestData));

                    if (files && files.length > 0) {
                        for (const file of files) {
                            await this.commonFileService.removeFileFromLocal(file.path);
                        }
                    }

                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: null,
                        message: 'Test email sent successfully.',
                    });

            }catch(emailError){
                if (files && files.length > 0) {
                    for (const file of files) {
                        await this.commonFileService.removeFileFromLocal(file.path);
                    }
                }
                await this.activityLogService.error_log(loged_user_id, req?.originalUrl, emailError?.message, emailError, req);
                throw new Error(emailError?.message || 'Failed to send test email.');
            }

        } catch (error) {
            if (files && files.length > 0) {
                for (const file of files) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
            }
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    @Post('view-campaign')
    async viewCampaign(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.hash) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }

            const loged_role_id = req.tokenUser?.role_id;
            const loged_user_id = req.tokenUser?.id;
            const loged_org_id = req.tokenUser?.org_id;

            let campRoleIdArr = [];
            if(loged_role_id == 40){
                campRoleIdArr = [loged_role_id];
            }else if(loged_role_id == 39){
                campRoleIdArr = [loged_role_id, 40, 11];
            }else if(loged_role_id == 38){
                campRoleIdArr = [loged_role_id, 40, 39, 11];
            }else{
                campRoleIdArr = [loged_role_id, 38, 39];
            }

            const id = postData?.id;
            const hash = postData?.hash;

            const CheckRequest = await lastValueFrom(
                this.client.send({ cmd: 'get_one_campaign_requests' }, { id: id, hash: hash })
            );
            if(!CheckRequest){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }

            const cam_role_id = CheckRequest['role_id'];
            const cam_org_id = CheckRequest['for_org_id'];
            const cam_title = CheckRequest['campaign_title'];
            const schedule_timezone = CheckRequest['timezone'];
            const withOption = CheckRequest['with_option'];

            let accessStatus = 0;
            if(!campRoleIdArr.includes(cam_role_id) || (loged_role_id == 11 && cam_org_id != loged_org_id)){
                accessStatus = 1;
            }

            if(accessStatus == 1){
                throw new Error('Sorry! You are not authorized to access this campaign.');
            }

            const sheet_header = CheckRequest['sheet_header'] ? JSON.parse(CheckRequest['sheet_header']) : [];

            let map_header = sheet_header;
            let lower_map_header = map_header.map(v =>
                typeof v === 'string' ? v.replace(/ /g, '').toLowerCase() : String(v).toLowerCase()
            );

            const EmailCellId = lower_map_header.indexOf('email');
            const searchEmail = postData?.searchEmail || '';

            const npid = postData?.npid || null;
            const pid = postData?.pid || null;
            const type = postData?.type || null;

            let schedulelist: any = [];
            let EmailScheduleCount = 0;

            if(npid == null && pid == null){
                if(withOption == 0){
                    const sheetDatas = await this.getSheetData(CheckRequest);

                    let filteredData: any = sheetDatas;
                    if(searchEmail && searchEmail != ''){
                        filteredData = sheetDatas.filter((item: any) =>
                            item[EmailCellId] && item[EmailCellId].toLowerCase().includes(searchEmail.toLowerCase())
                        );
                    }

                    EmailScheduleCount = filteredData.length;

                    if(!searchEmail || searchEmail == ''){
                        schedulelist = filteredData.slice(0, 25);
                    }else{
                        schedulelist = filteredData;
                    }
                }else{
                    const camOrgId = CheckRequest['for_org_id'];

                    if(camOrgId && camOrgId != 0){
                        const orgFilterData = CheckRequest['org_filter_data'] ?
                            JSON.parse(CheckRequest['org_filter_data']) : {};

                        if(searchEmail && searchEmail != ''){
                            orgFilterData['SearchEmail'] = searchEmail;
                        }
                        EmailScheduleCount = await this.userFileterData('count', camOrgId, orgFilterData);
                        schedulelist = await this.userFileterData('multiple', camOrgId, orgFilterData, 1, 25);
                    }
                }

                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: {
                        schedulelist,
                        EmailScheduleCount,
                        id,
                        hash,
                        role_id: loged_role_id,
                        EmailCellId,
                        withOption,
                        cam_title,
                        schedule_timezone
                    },
                    message: 'success',
                });
            }else{
                const cmp_id = id;
                const cmp_hash = hash;

                let page = 1;
                const limit = type == 'onpage' ? 10 : 25;

                if(withOption == 0){
                    if(pid != ""){
                        page = parseInt(pid) + 1;
                    }

                    const sheetDatas = await this.getSheetData(CheckRequest);

                    let filteredData: any = sheetDatas;
                    if(searchEmail && searchEmail != ''){
                        filteredData = sheetDatas.filter((item: any) =>
                            item[EmailCellId] && item[EmailCellId].toLowerCase().includes(searchEmail.toLowerCase())
                        );
                    }

                    let paginatedData: any = [];
                    if(!searchEmail || searchEmail == ''){
                        paginatedData = filteredData.slice(page, page + limit);
                    }else{
                        paginatedData = filteredData;
                    }

                    const dataJson: any = {};
                    dataJson['page'] = paginatedData.length > 0 ? (page + limit - 1) : page;

                    if(paginatedData && paginatedData.length > 0){
                        dataJson['nextpage'] = 1;

                        if(type == 'onpage'){
                            let html = '';
                            for(let i = 0; i < paginatedData.length; i++){
                                const srow = paginatedData[i];
                                const skey = page + i;
                                const srno = skey;
                                html += `<tr><td>${srno + 1}</td>`;

                                sheet_header.forEach((value, key) => {
                                    const lowerValue = value.toLowerCase();
                                    let itemText = srow[key];

                                    if(lowerValue.includes('date')){
                                        const dateString = srow[key];
                                        if(dateString && !isNaN(dateString)){
                                            const timestamp = Math.round((parseFloat(dateString) - 25569) * 86400);
                                            itemText = new Date(timestamp * 1000).toLocaleDateString('en-US', {
                                                month: '2-digit', day: '2-digit', year: 'numeric'
                                            });
                                        }
                                    }

                                    html += `<td>${itemText || ''}</td>`;
                                });

                                html += `<td><span class="customActionButton clicktoview" id="clicktoviews" data-sid="${skey}" data-cmpid="${cmp_id}" data-camphash="${cmp_hash}"><i class="fa fa-envelope"></i></span></td></tr>`;
                            }
                            dataJson['data'] = html;
                        }else{
                            let html = '';
                            for(let i = 0; i < paginatedData.length; i++){
                                const srow = paginatedData[i];
                                const skey = page + i;
                                const toemail = srow[EmailCellId];
                                html += `<li class='ViewEmailConent' data-sid='${skey}'><span>${toemail}</span></li>`;
                            }
                            dataJson['data'] = html;
                        }
                    }else{
                        dataJson['nextpage'] = 0;
                    }

                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: dataJson,
                        message: 'success',
                    });
                }else{
                    if(pid != ""){
                        page = parseInt(pid);
                    }else{
                        page = 2;
                    }

                    const offset = (page - 1) * limit;
                    const dataJson: any = {};
                    dataJson['page'] = page + 1;

                    const camOrgId = CheckRequest['for_org_id'];

                    if(camOrgId && camOrgId != 0){
                        const orgFilterData = CheckRequest['org_filter_data'] ?
                            JSON.parse(CheckRequest['org_filter_data']) : {};

                        if(searchEmail && searchEmail != ''){
                            orgFilterData['SearchEmail'] = searchEmail;
                        }

                        schedulelist = await this.userFileterData('multiple', camOrgId, orgFilterData, offset, limit);
                    }

                    if(schedulelist && schedulelist.length > 0){
                        dataJson['nextpage'] = 1;

                        if(type == 'onpage'){
                            let html = '';
                            const nsrno = (pid - 1) * 10;

                            for(let i = 0; i < schedulelist.length; i++){
                                const srno = i + nsrno;
                                html += '<tr>';
                                html += `<td>${srno + 1}</td>`;

                                sheet_header.forEach((value, key) => {
                                    const lowerValue = value.toLowerCase();
                                    let itemText = schedulelist[i][key];

                                    if(lowerValue.includes('date')){
                                        const dateString = schedulelist[i][key];
                                        if(dateString && !isNaN(dateString)){
                                            const timestamp = Math.round((parseFloat(dateString) - 25569) * 86400);
                                            itemText = new Date(timestamp * 1000).toLocaleDateString('en-US', {
                                                month: '2-digit', day: '2-digit', year: 'numeric'
                                            });
                                        }
                                    }

                                    html += `<td>${itemText || ''}</td>`;
                                });

                                html += `<td><span class="customActionButton clicktoview" id="clicktoviews" data-sid="${schedulelist[i][0]}" data-cmpid="${cmp_id}"><i class="fa fa-envelope"></i></span></td>`;
                                html += '</tr>';
                            }
                            dataJson['data'] = html;
                        }else{
                            let html = '';
                            for(const srow of schedulelist){
                                const ssid = srow[0];
                                const toemail = srow[EmailCellId];
                                html += `<li class='ViewEmailConent' data-sid='${ssid}'><span>${toemail}</span></li>`;
                            }
                            dataJson['data'] = html;
                        }
                    }else{
                        dataJson['nextpage'] = 0;
                    }

                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: dataJson,
                        message: 'success',
                    });
                }
            }

        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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

    @Post('details-campaign')
    async detailsCampaign(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
          
            if (!postData?.id || !postData?.hash || !postData?.sid) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }

            const loged_role_id = req.tokenUser?.role_id;
            const loged_user_id = req.tokenUser?.id;
            const loged_org_id = req.tokenUser?.org_id;

            let campRoleIdArr = [];
            if(loged_role_id == 40){
                campRoleIdArr = [loged_role_id];
            }else if(loged_role_id == 39){
                campRoleIdArr = [loged_role_id, 40, 11];
            }else if(loged_role_id == 38){
                campRoleIdArr = [loged_role_id, 40, 39, 11];
            }else{
                campRoleIdArr = [loged_role_id, 38, 39];
            }

            const id = postData?.id;
            const hash = postData?.hash;
            const sid = postData?.sid;
            const subhash = postData?.subhash || null;
            const CheckRequest = await lastValueFrom(
                this.client.send({ cmd: 'get_one_campaign_requests' }, { id: id, hash: hash })
            );
            if(!CheckRequest){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }

            const cam_role_id = CheckRequest['role_id'];
            const cam_org_id = CheckRequest['for_org_id'];

            let accessStatus = 0;
            if([38, 39, 40].includes(loged_role_id)){
                if(!campRoleIdArr.includes(cam_role_id)){
                    accessStatus = 1;
                }
            }else{
                if(!campRoleIdArr.includes(cam_role_id) || cam_org_id != loged_org_id){
                    accessStatus = 1;
                }
            }

            if(accessStatus == 1){
                throw new Error('Unauthorized to access.');
            }

            const jsonFileName = CheckRequest['json_file'] || '';
            let userDatas: any = {};

            if(jsonFileName != ''){
                const filedata = '';
                const fileContent = JSON.parse(filedata);
                userDatas = fileContent['userData'] || {};
            }

            let sheet_header = CheckRequest['sheet_header'] ? JSON.parse(CheckRequest['sheet_header']) : [];
            const withOption = CheckRequest['with_option'];

            if(withOption == 2 && subhash){
                const CheckSubRequest = await lastValueFrom(
                    this.client.send({ cmd: 'get_one_campaign_with_email_by_hash' }, { hash: subhash })
                );
                if(CheckSubRequest){
                    sheet_header = CheckSubRequest['sheet_header'] ? JSON.parse(CheckSubRequest['sheet_header']) : [];
                }
            }

            let map_header = sheet_header;
            let lower_map_header = map_header.map(v =>
                typeof v === 'string' ? v.replace(/ /g, '').toLowerCase() : String(v).toLowerCase()
            );

            const EmailCellId = lower_map_header.indexOf('email');

            let detailsOfMail: any = {};
            let RequestData: any = {};

            if(withOption == 0){
                const sheetDatas = await this.getSheetData(CheckRequest);
                const mailScheduler = sheetDatas[sid];

                const searchEmail = mailScheduler[EmailCellId] ? mailScheduler[EmailCellId].toLowerCase().trim() : '';

                const userEmailDetails = (userDatas && userDatas[searchEmail]) ? userDatas[searchEmail] : {};

                detailsOfMail['MailScheduler'] = mailScheduler;
                detailsOfMail['emailDetails'] = userEmailDetails;
                RequestData = CheckRequest;
            }else if(withOption == 1){
                const sheetDatas = await this.userFileterData('single', sid, {});

                const searchEmail = sheetDatas[EmailCellId] ? sheetDatas[EmailCellId].toLowerCase().trim() : '';

                const userEmailDetails = (userDatas && userDatas[searchEmail]) ? userDatas[searchEmail] : {};

                detailsOfMail['MailScheduler'] = sheetDatas;
                detailsOfMail['emailDetails'] = userEmailDetails;
                RequestData = CheckRequest;
            }else if(withOption == 2){
                const sheetDatas = await this.userFileterData('single', sid, {});

                const searchEmail = sheetDatas[EmailCellId] ? sheetDatas[EmailCellId].toLowerCase().trim() : '';

                const userEmailDetails = (userDatas && userDatas[searchEmail]) ? userDatas[searchEmail] : {};

                detailsOfMail['MailScheduler'] = sheetDatas;
                detailsOfMail['emailDetails'] = userEmailDetails;

                if(subhash){
                    const CheckSubRequest = await lastValueFrom(
                        this.client.send({ cmd: 'get_one_campaign_with_email_by_hash' }, { hash: subhash })
                    );
                    RequestData = CheckSubRequest || {};
                }else{
                    RequestData = {};
                }
            }

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {
                    detailsOfMail,
                    RequestData,
                    EmailCellId,
                    id,
                    hash,
                    subhash,
                    sid
                },
                message: 'success',
            });

        } catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
    async getSheetData(campaignRequest: any): Promise<any[]> {
        try {
            const filePath = `${appConstant.COMUNICATION_CAMPAIGN_FILE_PATH}/${campaignRequest.id}/${campaignRequest.file}`;
            const sheetData = await this.csvService.readCsv(filePath);

            return sheetData.slice(1);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async emailContentSet(data: any, templeteContent: string = ''): Promise<string> {
        let UnsubscribeLink = '';
        if(data['UnsubscribeLink']){
            UnsubscribeLink = `<a href="${data['UnsubscribeLink']}" target="_blank">Unsubscribe</a>`;
        }

        let map_header = [];
        if(data['map_header']){
            map_header = JSON.parse(data['map_header']);
        }

        let user_data = [];
        if(data['test_user_data']){
            user_data = JSON.parse(data['test_user_data']);
        }

        if(map_header.length > 0 && user_data.length > 0){
            map_header.forEach((value: string, key: number) => {
                if(value.toLowerCase().includes('date')){
                    let dateString = user_data[key];
                    if(dateString != '' && /^([0-9]*)$/.test(dateString)){
                        const timestamp = Math.round((dateString - 25569) * 86400);
                        user_data[key] = new Date(timestamp * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
                    }
                }
                const replace_para = value.replace(/ /g, '');
                templeteContent = templeteContent.replace(new RegExp(`{${replace_para}}`, 'g'), user_data[key] || '');
            });
        }

        if(data['ItemDetails'] && Object.keys(data['ItemDetails']).length > 0){
            for(const keys in data['ItemDetails']){
                const replace_para = keys.replace(/ /g, '');
                templeteContent = templeteContent.replace(new RegExp(`{${replace_para}}`, 'g'), data['ItemDetails'][keys] || '');
            }
        }

        templeteContent = templeteContent.replace(/{Unsubscribe}/g, UnsubscribeLink);

        const htmlWrapper = `<!DOCTYPE html>
        <html>
            <head>
                <meta charset='UTF-8'>
                <style>.zh-e-i-t ul,.zh-e-i-t ol{padding-left:0}.t_c_a{float:left;width:auto}.zh-e-i-t p{margin-bottom:0!important}.t_c_10{float:left;width:8.4%;word-wrap:break-word}.t_c_20{float:left;width:18.4%;word-wrap:break-word}.t_c_30{float:left;width:28.4%;word-wrap:break-word}.t_c_33{float:left;width:31.76%}.t_c_40{float:left;width:38.4%;word-wrap:break-word}.t_c_50{width:48.4%;float:left;word-wrap:break-word}.t_cr_50{width:48.4%;float:right;word-wrap:break-word}.t_c_60{float:left;width:58.4%;word-wrap:break-word}.t_c_70{float:left;width:68.4%;word-wrap:break-word}.t_c_80{float:left;width:78.4%;word-wrap:break-word}.t_c_90{float:left;width:88.4%;word-wrap:break-word}.t_c_100{float:left;width:98.4%;word-wrap:break-word}.t_c_45{float:left;width:45%;position:relative;word-wrap:break-word}.i-i-t{float:left;width:50%;word-wrap:break-word}.p_l_10{padding-left:10px!important}.p_r_10{padding-right:10px!important}.tr_c_33{width:31.65%;float:left;word-wrap:break-word}.td_d_100{width:100%;float:left;display:block;word-wrap:break-word}.tableWidth{width:660px!important}.bt_pc{font-family:Arial;line-height:21px;border-radius:6px!important;text-decoration:none!important;font-weight:bold;display:inline-block;box-sizing:border-box}.bt_pc_v{font-family:Arial;line-height:21px;border-radius:6px!important;text-decoration:none!important;font-weight:normal;display:inline-block;box-sizing:border-box}.mbt_pc{font-family:Arial;line-height:21px;text-decoration:none!important;font-weight:bold;display:inline-block;box-sizing:border-box;border-radius:0!important}.mbt_pc_v{font-family:Arial;line-height:21px;text-decoration:none!important;font-weight:normal;display:inline-block;box-sizing:border-box;border-radius:0!important}.dateDiv{padding:30px 20px;float:none;width:85%;border:1px solid #066CFF;margin:0 auto;display:inline-block;border-radius:25px}.t_c_ib_10{float:none;width:8.4%;display:inline-block;word-wrap:break-word}.t_c_ib_20{float:none;width:18.4%;display:inline-block;word-wrap:break-word}.t_c_ib_30{float:none;width:28.4%;display:inline-block;word-wrap:break-word}.t_c_ib_40{float:none;width:38.4%;display:inline-block;word-wrap:break-word}.t_c_ib_50{float:none;width:48.4%;display:inline-block;word-wrap:break-word}.t_c_ib_60{float:none;width:58.4%;display:inline-block;word-wrap:break-word}.t_c_ib_70{float:none;width:68.4%;display:inline-block;word-wrap:break-word}.t_c_ib_80{float:none;width:78.4%;display:inline-block;word-wrap:break-word}.t_c_ib_90{float:none;width:84.4%;display:inline-block;word-wrap:break-word}.t_c_ib_100{float:none;width:98.4%;display:inline-block;word-wrap:break-word}.ul_lh{line-height:35px}p{margin-bottom:0;margin-top:5px}.zh-bg-hei{height:180px;vertical-align:middle;display:table-cell!important;width:10%}.zh-bg-hei170{height:170px;vertical-align:middle;display:table-cell!important;width:10%}.zh-line-p p{line-height:30px!important}table.ContentTableCSS:last-child{margin-bottom:0}table.ContentTableCSS{border:1px solid #000;margin-bottom:20px}table.ContentTableCSS thead{background:#000;color:#fff}table.ContentTableCSS thead tr th{padding:10px 15px;text-align:center;font-weight:500;font-size:14px}table.ContentTableCSS tbody tr td{padding:15px 10px;text-align:center;font-size:14px}table.ContentTableCSS .f-td-c thead tr th{position:inherit;padding:10px;text-align:center;border:1px solid #066CFF}label.ContentLabelCSS{font-size:14px;font-weight:600;margin-bottom:10px;float:left;width:100%}table.ContentTableCSS .f-td-c thead{background:#066CFF}table.ContentTableCSS .f-td-c{border-color:#066CFF}table.ContentTableCSS .f-td-c tbody tr td{position:inherit;color:#000;border-color:#066CFF}table.ContentTableCSS .f-td-c tbody tr td:first-child{background:#A2C4FB;color:#066CFF}table.ContentNoTableCSS:last-child{margin-bottom:0}table.ContentNoTableCSS{border:0}table.ContentNoTableCSS thead tr th{padding:0;text-align:left;font-weight:500;font-size:14px}table.ContentNoTableCSS tbody tr td{padding:5px 0;text-align:left;font-size:14px}table.ContentNoTableCSS tbody tr td ul{padding-left:10px;margin:0}.sta-l{float:left}.sta-r{float:right}.sta-mar-l{margin-left:5px}.sta-mar-r{margin-right:5px}.sta-pad-l{padding-left:2px}.sta-pad-r{padding-right:2px}.sta-pad-lr22{padding-right:2px;padding-left:2px}.structureSetion{border:dotted 0}.structureCol100{width:100%}.structureCol50{width:49.5%}.structureCol33{width:32.93%}.structureCol25{width:24.54%}.structureCol75{width:74.7%}.subItemstructure{position:relative}.subItemstructure:hover{outline:1px solid #066cff;outline-offset:0}.systemTextmessages{word-break:break-word}.zh-p-e-i-t{display:block}.staBox{float:left;width:100%}.structureSetion .t_c_10{width:7.4%}.structureSetion .t_c_20{width:17.4%}.structureSetion .t_c_30{width:27.4%}.structureSetion .t_c_33{width:30.76%}.structureSetion .t_c_40{width:37.4%}.structureSetion .t_c_50{width:47.5%}.structureSetion .t_cr_50{width:47.5%;float:right}.structureSetion .t_c_60{width:57.4%}.structureSetion .t_c_70{width:67.4%}.structureSetion .t_c_80{width:77.4%}.structureSetion .t_c_90{width:87.4%}.structureSetion .t_c_100{width:97.4%}.structureSetion .t_c_45{width:44%}@media screen and (max-width:500px){.t_c_10,.t_c_20,.t_c_30,.t_c_40,.t_c_50,.t_c_60,.t_c_70,.t_c_80,.t_c_90,.t_c_100{width:100%;padding:0!important}.t_cr_10,.t_cr_20,.t_cr_30,.t_cr_40,.t_cr_50,.t_cr_60,.t_cr_70,.t_cr_80,.t_cr_90,.t_cr_100{width:100%;padding:0!important}.structureSetion .t_c_10,.structureSetion .t_c_20,.structureSetion .t_c_30,.structureSetion .t_c_40,.structureSetion .t_c_50,.structureSetion .t_c_60,.structureSetion .t_c_70,.structureSetion .t_c_80,.structureSetion .t_c_90,.structureSetion .t_c_100{width:100%}.structureSetion .t_cr_10,.structureSetion .t_cr_20,.structureSetion .t_cr_30,.structureSetion .t_cr_40,.structureSetion .t_cr_50,.structureSetion .t_cr_60,.structureSetion .t_cr_70,.structureSetion .t_cr_80,.structureSetion .t_cr_90,.structureSetion .t_cr_100{width:100%}.tr_c_33{width:100%;padding:0!important}.tableWidth{width:100%!important}h1,h4{margin:0}.i-i-t{max-width:100%!important;padding:0 0 15px!important}.f_t_w{width:100%!important}.structureCol50,.structureCol33,.structureCol25,.structureCol75{width:100%}.sta-l{float:left}.sta-r{float:right}.sta-mar-l{margin-left:0}.sta-mar-r{margin-right:0}.sta-pad-l{padding-left:0}.sta-pad-r{padding-right:0}.sta-pad-lr22{padding-right:0;padding-left:0}}</style>
            </head>
            <body>
                ${templeteContent}
            </body>
        </html>`;

        return htmlWrapper;
    }

    async getQuizDetails(q_id: number, org_id: number): Promise<any> {
        try {
            const membershipcode = await this.companyService.getCompanyCodeFromId(org_id);

            const QData = await this.quizAssignQuizOrgService.getQuizDetailsForCampaign(q_id, membershipcode);

            const QDataS: any = {};
            if(QData && QData !== null){
                QDataS['QuizName'] = QData['QuizName'];
                QDataS['StartDate'] = new Date(QData['StartDate']).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
                QDataS['EndDate'] = new Date(QData['EndDate']).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
            }

            return QDataS;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getEventDetails(e_id: number, org_id: number): Promise<any> {
        try {
            let actualOrgId = org_id;

            const globalEventCheck = await this.eventGlobalEventsService.checkGlobalEvent(e_id, org_id);
            if(globalEventCheck){
                actualOrgId = 0;
            }

            const QData = await this.eventService.getEventDetailsForCampaign(e_id, actualOrgId);

            const QDataS: any = {};
            if(QData && QData !== null){
                QDataS['EventName'] = QData['EventName'];
                QDataS['Address'] = QData['Address'];
                QDataS['StartDate'] = QData['StartDate'];
                QDataS['EndDate'] = QData['EndDate'];
            }

            return QDataS;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getChallengeDetails(i_id: number, org_id: number): Promise<any> {
        try {
            const CData = await this.scheduleChallengeService.getChallengeDetailsForCampaign(i_id, org_id);

            const CDataS: any = {};
            if(CData && CData !== null){
                CDataS['ChallengeName'] = CData['ChallengeName'];
                CDataS['StartDate'] = CData['StartDate'];
                CDataS['EndDate'] = CData['EndDate'];
                CDataS['RegistrationStartDate'] = CData['RegistrationStartDate'];
                CDataS['RegistrationEndDate'] = CData['RegistrationEndDate'];
            }

            return CDataS;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getCampaignDetails(i_id: number, org_id: number, td_type: number, s_i_id: any, userRole: number, userIds: number[]): Promise<any> {
        try {
            const membershipcode = await this.companyService.getCompanyCodeFromId(org_id);

            if(td_type == 0){
                let subItemIds = [];
                if(!Array.isArray(s_i_id)){
                    subItemIds = s_i_id.split(',').map(id => parseInt(id));
                } else {
                    subItemIds = s_i_id;
                }

                const CData = await this.campaignService.getCampaignRewardDetails(i_id, subItemIds);

                const campaignFarray: any = {};
                const rewardHtmlArray = [];

                if(CData && CData !== null){
                    campaignFarray['CampaignName'] = CData['campaign_name'];
                    campaignFarray['StartDate'] = new Date(CData['start_date']).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
                    campaignFarray['EndDate'] = new Date(CData['end_date']).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });

                    if(CData['Campaignreward'] && CData['Campaignreward'].length > 0){
                        CData['Campaignreward'].forEach(reward => {
                            let rewardHtml = '';
                            rewardHtml += `<label class="ContentLabelCSS">${reward['reward_name']}</label>`;
                            rewardHtml += '<table class="ContentTableCSS" width="100%" aria-describedby="Reward Table" cellspacing="0" cellpadding="0" border="1">';
                            rewardHtml += '<thead>';
                            rewardHtml += '<tr>';
                            rewardHtml += '<th style="width: 50%;">Reward Name</th>';
                            rewardHtml += '<th style="width: 25%;">Points Required</th>';
                            rewardHtml += '<th style="width: 25%;">Prize</th>';
                            rewardHtml += '</tr>';
                            rewardHtml += '</thead>';
                            rewardHtml += '<tbody>';

                            if(reward['Cashreward'] && reward['Cashreward'].length > 0){
                                reward['Cashreward'].forEach(cash => {
                                    rewardHtml += '<tr>';
                                    rewardHtml += `<td>${cash['cust_name'] || '- - -'}</td>`;
                                    if(userRole == 2){
                                        rewardHtml += `<td>${cash['point_user'] ? cash['point_user'] + ' Pts' : ' - - - '}</td>`;
                                        rewardHtml += `<td>${cash['amt_user'] ? cash['amt_user'] + '$ Cash Prize' : ' - - - '}</td>`;
                                    } else {
                                        rewardHtml += `<td>${cash['point_spouse'] ? cash['point_spouse'] + ' Pts' : ' - - - '}</td>`;
                                        rewardHtml += `<td>${cash['amt_spouse'] ? cash['amt_spouse'] + '$ Cash Prize' : ' - - - '}</td>`;
                                    }
                                    rewardHtml += '</tr>';
                                });
                            }

                            if(reward['Insurancereward'] && reward['Insurancereward'].length > 0){
                                reward['Insurancereward'].forEach(insurance => {
                                    rewardHtml += '<tr>';
                                    rewardHtml += `<td>${insurance['cust_name'] || insurance['Insuranceplan']['plan_name']}</td>`;
                                    if(userRole == 2){
                                        rewardHtml += `<td>${insurance['point_user'] ? insurance['point_user'] + ' Pts' : ' - - - '}</td>`;
                                        rewardHtml += `<td>${insurance['amt_user'] ? insurance['amt_user'] + '$ Cash Prize' : ' - - - '}</td>`;
                                    } else {
                                        rewardHtml += `<td>${insurance['point_spouse'] ? insurance['point_spouse'] + ' Pts' : ' - - - '}</td>`;
                                        rewardHtml += `<td>${insurance['amt_spouse'] ? insurance['amt_spouse'] + '$ Cash Prize' : ' - - - '}</td>`;
                                    }
                                    rewardHtml += '</tr>';
                                });
                            }

                            if(reward['Otherreward'] && reward['Otherreward'].length > 0){
                                reward['Otherreward'].forEach(other => {
                                    rewardHtml += '<tr>';
                                    rewardHtml += `<td>${other['cust_name'] || '- - -'}</td>`;
                                    rewardHtml += `<td>${other['point'] ? other['point'] + ' Pts' : ' - - - '}</td>`;
                                    rewardHtml += '<td> - - - </td>';
                                    rewardHtml += '</tr>';
                                });
                            }

                            rewardHtml += '</tbody>';
                            rewardHtml += '</table>';
                            rewardHtmlArray.push(rewardHtml);
                        });
                    }

                    campaignFarray['RewardDetails'] = rewardHtmlArray.join('');
                }

                return campaignFarray;
            } else {
                const campaign = await this.campaignService.getCampaignSummaryDetails(i_id, org_id);

                if(!campaign || campaign.length === 0){
                    return {};
                }

                const campaignFarray: any = {};
                campaignFarray['CampaignName'] = campaign[0]['campaign_name'];
                campaignFarray['StartDate'] = new Date(campaign[0]['start_date']).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
                campaignFarray['EndDate'] = new Date(campaign[0]['end_date']).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });

                const userDataForReport = await this.userService.getUsersForCampaignReport(membershipcode, userIds);
                const datasCam = await this.getCampaignHtml(userDataForReport, '', org_id);

                let rewardHtml = '';
                if(datasCam && datasCam['actNames']){
                    rewardHtml += '<table class="ContentTableCSS" width="100%" aria-describedby="Activity Table" cellspacing="0" cellpadding="0" border="1">';
                    rewardHtml += '<thead>';
                    rewardHtml += '<tr>';
                    rewardHtml += '<th style="width: 50%;">Required Task</th>';
                    rewardHtml += '<th style="width: 16.66%;">Points Required</th>';
                    rewardHtml += '<th style="width: 16.66%;">Earned Points</th>';
                    rewardHtml += '<th style="width: 16.66%;">Task Complete</th>';
                    rewardHtml += '</tr>';
                    rewardHtml += '</thead>';
                    rewardHtml += '<tbody>';
                    rewardHtml += '</tbody>';
                    rewardHtml += '</table>';
                }

                campaignFarray['CampaignSummary'] = rewardHtml;

                return campaignFarray;
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getCampaignHtml(rewardWiseUsers: any, Rname: string, companyid: number, marc: any = null): Promise<any> {
        try {
            const result = {
                actNames: {},
                datas: {}
            };

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getCampaignRanking(campaign_id: number, org_id: number): Promise<any> {
        try {
            const membershipcode = await this.companyService.getCompanyCodeFromId(org_id);

            const camp = await this.campaignService.getCampaignById(campaign_id);

            if(!camp || camp === null){
                return {};
            }

            const rewards = await this.campaignRewardService.getRewardsByCampaignId(campaign_id);

            if(!rewards || rewards.length === 0){
                return {};
            }

            const rewardDetsils = {};

            return rewardDetsils;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getRewardRankingHtml(usersdata: any = {}, subAllRewards: any = [], campaign: any = {}): Promise<any> {
        try {
            const campaignWUarray: any = {};

            if(campaign && campaign['Campaign']){
                const campaignData = campaign['Campaign'];
                if(campaignData['campaign_name']){
                    campaignWUarray['CampaignName'] = campaignData['campaign_name'];
                }
                if(campaignData['start_date']){
                    campaignWUarray['StartDate'] = new Date(campaignData['start_date']).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
                }
                if(campaignData['end_date']){
                    campaignWUarray['EndDate'] = new Date(campaignData['end_date']).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
                }
            }

            if(subAllRewards && subAllRewards.length > 0 && usersdata && Object.keys(usersdata).length > 0){
                let RrankingHtml = '';

                for(const value of subAllRewards){
                    let rewardPoints = '';
                    let rewardName = '';
                    let usersdataA: any[] = [];

                    if(value['Insurancereward']){
                        if(usersdata[value['Insurancereward']['reward_id']]){
                            usersdataA = Object.values(usersdata[value['Insurancereward']['reward_id']]);
                            usersdataA.sort((a, b) => (b['Point'] || 0) - (a['Point'] || 0));
                        }
                        rewardName = value['Insurancereward']['cust_name'];
                        if(!rewardName || rewardName === ''){
                            rewardName = value['Insuranceplan']['plan_name'];
                        }
                        rewardName = `${rewardName} #${value['Insurancereward']['point_user']} Points <br/> ($${value['Insurancereward']['amt_user']} Gift Card)`;
                        rewardPoints = value['Insurancereward']['point_user'];
                    } else if(value['Cashreward']){
                        if(usersdata[value['Cashreward']['reward_id']]){
                            usersdataA = Object.values(usersdata[value['Cashreward']['reward_id']]);
                            usersdataA.sort((a, b) => (b['Point'] || 0) - (a['Point'] || 0));
                        }
                        rewardName = `${value['Cashreward']['cust_name']} #${value['Cashreward']['point_user']} Points <br/> ($${value['Cashreward']['amt_user']} Gift Card)`;
                        rewardPoints = value['Cashreward']['point_user'];
                    } else if(value['Otherreward']){
                        if(usersdata[value['Otherreward']['reward_id']]){
                            usersdataA = Object.values(usersdata[value['Otherreward']['reward_id']]);
                            usersdataA.sort((a, b) => (b['Point'] || 0) - (a['Point'] || 0));
                        }
                        rewardName = `${value['Otherreward']['cust_name']} #${value['Otherreward']['point']} Points`;
                        rewardPoints = value['Otherreward']['point'];
                    }

                    RrankingHtml += '<table class="ContentNoTableCSS" width="100%" aria-describedby="Ranking Table" cellspacing="0" cellpadding="0" border="0" style="text-align:left;margin-bottom:15px !important;">';
                    RrankingHtml += '<thead>';
                    RrankingHtml += '<tr>';
                    RrankingHtml += `<th><b>${rewardName}</b></th>`;
                    RrankingHtml += '</tr>';
                    RrankingHtml += '</thead>';
                    RrankingHtml += '<tbody>';

                    const winnerUsers: string[] = [];
                    let ss = 0;

                    if(usersdataA && usersdataA.length > 0){
                        for(let i = 0; i < usersdataA.length; i++){
                            const userPoints = usersdataA[i]['Point'] || 0;
                            if(userPoints >= parseFloat(rewardPoints)){
                                const firstName = usersdataA[i]['User']['first_name'] || '';
                                const lastName = usersdataA[i]['User']['last_name'] || '';
                                winnerUsers.push(`<li>${firstName} ${lastName}</li>`);
                                ss++;
                            }
                            if(ss === 10){
                                break;
                            }
                        }
                    }

                    RrankingHtml += '<tr>';
                    RrankingHtml += '<td style="padding-top:15px !important;">';
                    RrankingHtml += '<ul>';
                    if(winnerUsers.length > 0){
                        RrankingHtml += winnerUsers.join('');
                    } else {
                        RrankingHtml += 'No Winner Found';
                    }
                    RrankingHtml += '</ul>';
                    RrankingHtml += '<td>';
                    RrankingHtml += '</td>';
                    RrankingHtml += '</tr>';
                    RrankingHtml += '</tbody>';
                    RrankingHtml += '</table>';
                }

                campaignWUarray['RewardWiseWinnerUsers'] = RrankingHtml;
            } else {
                campaignWUarray['RewardWiseWinnerUsers'] = 'No Winner Found';
            }

            return campaignWUarray;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    @Put('update')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.COMUNICATION_CAMPAIGN_FILE_TEMP_PATH}`,
                filename: fileName,
            }),
            fileFilter: datafileFilter,
        }),
        AccessGuard
    )
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCommunicationEmailCampaignRequestsInput, @UploadedFile() file: Express.Multer.File) {
        let tempCsvPathForCleanupUpdate = null;
        try {
            /* organization object se for_org_id extract - edit/update ke time */
            if (postData?.organization && (!postData.for_org_id || postData.for_org_id === 0)) {
                const org = typeof postData.organization === 'string' ? (() => { try { return JSON.parse(postData.organization); } catch { return null; } })() : postData.organization;
                if (org && (org.id || org.for_org_id)) {
                    postData.for_org_id = org.id || org.for_org_id;
                }
            }
           
            if (!postData?.hash && !postData?.id) {
                if (
                    postData?.with_option === '0' &&
                    file &&
                    file.fieldname === 'file' &&
                    file.filename
                ) {
                    await this.commonFileService.removeFileFromLocal(file.path);
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let inProgressCheck = {};
            let getCampaignDetails = null;
            if(postData?.id && postData?.hash){
                inProgressCheck = await lastValueFrom(this.client.send({ cmd: 'check_campaign_datas' }, [postData, 'firstCheck']));
                getCampaignDetails = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, {id : postData?.id, hash : postData?.hash}));
            }
            if(postData?.id && postData?.hash && getCampaignDetails !== null && getCampaignDetails !== undefined){
                if(inProgressCheck['pendingCampaign'] !== '0' || inProgressCheck['draftCampaign'] !== '0' || inProgressCheck['pausedCampaign'] !== '0' || inProgressCheck['resumeCampaign'] !== '0'){
                    const loged_role_id = req.tokenUser?.role_id;
                    let loged_org_id = 0;
                    let campRoleIdArr = [];
                    if(loged_role_id == 40){
                        campRoleIdArr = [loged_role_id];
                    }else if(loged_role_id == 39){
                        campRoleIdArr = [loged_role_id,40,11];
                    }else if(loged_role_id == 39){
                        campRoleIdArr = [loged_role_id,40,39,11];
                    }else {
                        loged_org_id = req.tokenUser?.org_id;
                        campRoleIdArr = [loged_role_id,38,39];
                    }
                    let accessStatus = 1;
                    if(inProgressCheck['checkCampaign'] !== 0){
                        const cam_role_id = getCampaignDetails['role_id'];
                        const cam_org_id = getCampaignDetails['for_org_id'];
                        if(campRoleIdArr.includes(cam_role_id)){
                            accessStatus = 0;
                            if(loged_role_id == 11 && loged_org_id != cam_org_id){
                                accessStatus = 1;
                            }
                        }
                    } 
                    if(accessStatus == 0){
                        /* WITH OPTION 0 */
                            if(postData?.with_option === '0'){
                                if(file && typeof file !== undefined && file.fieldname === 'file' && file.filename && file.originalname && file.originalname != ''){
                                    const fileExt = pathInfo.extname(file.originalname).toLowerCase();
                                    let sheetData = [];
                                    if (fileExt === '.csv') {
                                        sheetData = await this.csvService.readCsv(file.path);
                                    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
                                        const jsonFileName = await this.commonFileService.createFileToJson(file.path, 'excel_to_json.py', req);
                                        if (jsonFileName && jsonFileName['status'] === 1) {
                                            const jsonPath = file.path.replace(fileExt, '.json');
                                            sheetData = await this.commonFileService.readFile(jsonPath);
                                        }
                                    }
                                    let sheetTotalData = sheetData.length;
                                    if(sheetTotalData > 1){
                                        if(sheetTotalData <= 2001){
                                            let headerData = sheetData[0];
                                            let MainheaderData = sheetData[0];
                                            sheetData = sheetData.slice(1);
                                            sheetTotalData = sheetData.length;
                                            headerData = headerData.map(item => item.toLowerCase().trim());
                                            if(!headerData.find(item => item.toLowerCase() === 'email')){
                                                throw new Error('Email column is missing in the file.');
                                            }
                                            const emailKey = headerData.indexOf('email');
                                            let sheetEamilArray = sheetData.map(innerArray => innerArray[emailKey]);
                                            sheetEamilArray = sheetEamilArray.filter(value => value.trim() !== '');
                                            const totalSheetEmails = sheetEamilArray.length;
                                            const testUserData = sheetData[0];
                                            if(headerData.length !== 0){
                                                if(sheetTotalData !== totalSheetEmails){
                                                    throw new Error('All contacts in email value is required. Some Contact in email value is missing.');
                                                }else{
                                                    if (fileExt === '.xlsx' || fileExt === '.xls') {
                                                        await this.commonFileService.dirIsExist(`${appConstant.COMUNICATION_CAMPAIGN_FILE_TEMP_PATH}`);
                                                        const jsonPath = file.path.replace(fileExt, '.json');
                                                        const excelData: any = await this.commonFileService.createJsonToFile(1, jsonPath, 'pythoncreatecsv.py');
                                                        if (excelData?.status === 'success') {
                                                            const tempCsvPath = jsonPath.replace('.json', '.csv');
                                                            tempCsvPathForCleanupUpdate = tempCsvPath;
                                                            postData.file = tempCsvPath;
                                                            await this.commonFileService.removeFileFromLocal(jsonPath);
                                                        } else {
                                                            throw new Error('Failed to convert file to CSV.');
                                                        }
                                                    } else {
                                                        postData.file = file.path;
                                                    }
                                                    postData.sheet_header = JSON.stringify(MainheaderData);
                                                    postData.test_mail_user_data = JSON.stringify(testUserData);
                                                    /* for_org_id mat overwrite - organization preserve karo */
                                                }
                                            }else{
                                                throw new Error('Data not found.');
                                            }
                                        }else{
                                            throw new Error('No. of contacts must be less than or equal to 2000 contacts.');
                                        }
                                    }else{
                                        throw new Error('Data not found.');
                                    }
                                }else{
                                    delete postData?.file;
                                    /* Edit without new file: existing for_org_id preserve karo */
                                    if((!postData.for_org_id || postData.for_org_id === 0) && getCampaignDetails?.for_org_id){
                                        postData.for_org_id = getCampaignDetails.for_org_id;
                                    }
                                }
                            }
                        /* WITH OPTION 0 */
                        /* WITH OPTION 1 */
                            if(postData?.with_option === '1'){
                                postData.sheet_header = '["ID","First Name","Last Name","Email","Gender","Health Plan","User Code","User Name","Status","Role","Organization Name","Department","Location","Subscribe"]';
                                let DepartmentArr = [];
                                if(req?.body?.department && typeof req?.body?.department === 'string'){
                                    DepartmentArr = req?.body?.department.split(',');
                                    DepartmentArr = DepartmentArr.map(item => `"${item}"`);
                                }
                                let LocationArr = [];
                                if(req?.body?.location && typeof req?.body?.location === 'string'){
                                    LocationArr = req?.body?.location.split(',');
                                    LocationArr = LocationArr.map(item => `"${item}"`);
                                }
                                let HealthPlanNameArr = [];
                                if(req?.body?.health_plan_name && typeof req?.body?.health_plan_name === 'string'){
                                    HealthPlanNameArr = req?.body?.health_plan_name.split(',');
                                    HealthPlanNameArr = HealthPlanNameArr.map(item => `"${item}"`);
                                }
                                const orgFilertDatas = {
                                    department : (DepartmentArr.length > 0 ? DepartmentArr : ""),
                                    location : (LocationArr.length > 0 ? LocationArr : ""),
                                    on_health_plan : (req.body.on_health_plan && req.body.on_health_plan !== null && req.body.on_health_plan !== undefined) ? req.body.on_health_plan : "2",
                                    health_plan_name : (HealthPlanNameArr.length > 0 ? HealthPlanNameArr : ""),
                                    gender : (req.body.gender && req.body.gender !== null && req.body.gender !== undefined) ? req.body.gender : "all",
                                    terminated : (req.body.terminated && req.body.terminated !== null && req.body.terminated !== undefined) ? req.body.terminated : "0",
                                    eligibility : (req.body.eligibility && req.body.eligibility !== null && req.body.eligibility !== undefined) ? req.body.eligibility : "7",
                                };
                                let getTestUser = await this.userFileterData('testUser', postData?.for_org_id, orgFilertDatas);
                                getTestUser = await this.convertToIndexedObject(getTestUser);
                                if(getTestUser && getTestUser !== null && getTestUser !== undefined){
                                    postData.test_mail_user_data = JSON.stringify(getTestUser);
                                    postData.org_filter_data = JSON.stringify(orgFilertDatas).replace(/\\\"/g, '');
                                    postData.test_user_role = getTestUser[9]; /* USER ROLE */
                                    postData.test_user_id = getTestUser[0]; /* USER ID */
                                }else{
                                    throw new Error('Your filter according user not found.');
                                }
                            }
                        /* WITH OPTION 1 */
                        let resMessage = '';
                        let resData = {};
                        postData.updated_by = req.tokenUser?.id;
                        let inProgressCheckSecond = {};
                        if(postData?.id && postData?.hash){
                            inProgressCheckSecond = await lastValueFrom(this.client.send({ cmd: 'check_campaign_datas' }, [postData, 'secondCheck']));
                        }
                        let inProgressStatus = 0;
                        if(postData?.id && postData?.hash && (inProgressCheckSecond['pendingCampaign'] !== '0' || inProgressCheckSecond['draftCampaign'] !== '0' || inProgressCheckSecond['pausedCampaign'] !== '0' || inProgressCheckSecond['resumeCampaign'] !== '0')){
                            inProgressStatus = 1;
                        }
                        if(inProgressStatus == 0){
                            /* WITH OPTION 0 */
                                if(postData?.with_option === '0' && file && file.fieldname === 'file' && file.filename && file.originalname){
                                    const fileExt = pathInfo.extname(file.originalname).toLowerCase();
                                    const saveExt = (fileExt === '.xlsx' || fileExt === '.xls') ? '.csv' : fileExt;
                                    await this.commonFileService.copyFiles(postData?.file, `${appConstant.COMUNICATION_CAMPAIGN_FILE_PATH}/${postData?.id}`,`${postData?.hash}${saveExt}`);
                                    postData.file = `${postData?.hash}${saveExt}`;
                                    if (tempCsvPathForCleanupUpdate) {
                                        await this.commonFileService.removeFileFromLocal(tempCsvPathForCleanupUpdate);
                                    }
                                    if (file.path && (fileExt === '.xlsx' || fileExt === '.xls')) {
                                        await this.commonFileService.removeFileFromLocal(file.path);
                                    }
                                }
                            /* WITH OPTION 0 */
                           
                            const campaignDatas = await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, postData));
                            if(campaignDatas && campaignDatas !== null && campaignDatas !== undefined){
                                /* WITH OPTION 2 */
                                    if(postData?.with_option === '2'){
                                        let SubCampaignUpdateData = {};
                                        if(postData?.campaign_title){
                                            SubCampaignUpdateData['campaign_title'] = postData?.campaign_title;
                                        }
                                        SubCampaignUpdateData['parent_id'] = postData?.id;
                                        await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, SubCampaignUpdateData));
                                    }
                                /* WITH OPTION 2 */
                                resData = {
                                    id: postData?.id,
                                    hash: postData?.hash,
                                };
                            }
                            resMessage = 'Request updated successfully.';
                        }else{
                            resMessage = 'Sorry! Request go to in-progress.';
                        }
                        return res.status(HttpStatus.CREATED).json({
                            statusCode: 201,
                            success: 1,
                            error: 0,
                            data: resData,
                            message: resMessage,
                        });
                    }else{
                        throw new Error('Sorry! You are not authorized to access this campaign.');
                    }
                }else{
                    if(postData?.id && postData?.hash && inProgressCheck['checkCampaign'] === 0){
                        throw new Error('Sorry! Campaign is not found.');
                    }else{
                        throw new Error('Sorry! Request go to in-progress.');
                    }
                }
            }else{
                throw new Error('Sorry! Campaign is not found.');
            }
        } catch (error) {
            if (
                postData?.with_option === '0' &&
                file &&
                file.fieldname === 'file' &&
                file.filename
            ) {
                if (tempCsvPathForCleanupUpdate) {
                    await this.commonFileService.removeFileFromLocal(tempCsvPathForCleanupUpdate);
                }
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
    @Post('request-send-to-approval')
    async requestSendToApproval(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.hash) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id , hash: postData?.hash };
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, where));
            if (!campaignRequests) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if(campaignRequests && campaignRequests !== null && campaignRequests !== undefined){
                const loged_role_id = req.tokenUser?.role_id;
                let campRoleIdArr = [];
                if(loged_role_id == 40){
                    campRoleIdArr = [loged_role_id];
                }else if(loged_role_id == 39){
                    campRoleIdArr = [loged_role_id,40,11];
                }else{
                    campRoleIdArr = [loged_role_id,40,39,11];
                }
                let accessStatus = 1;
                const cam_role_id = campaignRequests['role_id'];
                if(campRoleIdArr.includes(cam_role_id)){
                    accessStatus = 0;
                } 
                if(accessStatus == 0){
                    let verifyStatusArray = null;
                    if(campaignRequests.approval_status_data !== '' && campaignRequests.approval_status_data !== null){
                        verifyStatusArray = JSON.parse(campaignRequests['approval_status_data']);
                    }else{
                        verifyStatusArray =
                        {
                            campaign_name : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            user_sheet : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            from_email : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            subject : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            mail_content : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            attchament : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            send_test_mail : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            schedule_datetime : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            timezone : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' }
                        }
                    }
                    for (let key in verifyStatusArray) {
                        if (verifyStatusArray.hasOwnProperty(key)) {
                            verifyStatusArray[key].status = '0';
                            verifyStatusArray[key].datetime = '';
                            verifyStatusArray[key].ad_user_id = '';
                            verifyStatusArray[key].ad_user_name = '';
                        }
                    }
                    postData.approval_status = 1;
                    postData.approval_status_data = JSON.stringify(verifyStatusArray);  
                    postData.updated_by = req.tokenUser?.id;
                    await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, postData));
                    return res.status(HttpStatus.CREATED).json({
                        statusCode: 201,
                        success: 1,
                        error: 0,
                        data: [],
                        message: 'Request successfully sent for approval.',
                    });
                }else{
                    throw new Error('Sorry! You are not authorized to access this campaign.');
                }
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
    @Post('request-verify-status')
    async requestVerifyStatus(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            // console.log('[request-verify-status] hit', { id: postData?.id, hash: postData?.hash, role_id: req.tokenUser?.role_id, source: postData?.source, status: postData?.status });
            if (!postData?.id && !postData?.hash) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id , hash: postData?.hash };
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, where));
            if (!campaignRequests) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if(campaignRequests && campaignRequests !== null && campaignRequests !== undefined){
                const loged_role_id = req.tokenUser?.role_id;
                const loged_user_id = req.tokenUser?.id;
                const loged_user_name = req.tokenUser?.first_name + ' ' + req.tokenUser?.last_name;
                let campRoleIdArr = [];
                if(loged_role_id == 40){
                    campRoleIdArr = [loged_role_id];
                }else if(loged_role_id == 39){
                    campRoleIdArr = [loged_role_id,40,11];
                }else{
                    campRoleIdArr = [loged_role_id,40,39,11];
                }
                let accessStatus = 1;
                const cam_role_id = campaignRequests['role_id'];
                if(campRoleIdArr.includes(cam_role_id)){
                    accessStatus = 0;
                }
                // Only role 38 (GLOBALMARKETINGMANAGER) can approve/reject campaign requests
                if(accessStatus == 0 && loged_role_id != 38){
                    throw new Error('Only Global Marketing Manager can approve or reject campaign requests.');
                }
                if(accessStatus == 0){
                    let verifyStatusArray = null;
                    if(campaignRequests.approval_status_data !== '' && campaignRequests.approval_status_data !== null){
                        verifyStatusArray = JSON.parse(campaignRequests['approval_status_data']);
                    }else{
                        verifyStatusArray =
                        {
                            campaign_name : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            user_sheet : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            from_email : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            subject : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            mail_content : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            attchament : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            send_test_mail : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            schedule_datetime : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' },
                            timezone : { status : '0', datetime : '', ad_user_id : '', ad_user_name : '' }
                        }
                    }
                    if(postData?.source == 'all'){
                        for (let key in verifyStatusArray) {
                            if (verifyStatusArray.hasOwnProperty(key)) {
                                verifyStatusArray[key].status = postData?.status;
                                verifyStatusArray[key].datetime = `${ await this.getCurrentDateTime()}`;
                                verifyStatusArray[key].ad_user_id = `${loged_user_id}`;
                                verifyStatusArray[key].ad_user_name = `${loged_user_name}`;
                            }
                        }
                    }else if(postData?.source == 'single'){
                        for (let key in verifyStatusArray) {
                            if (verifyStatusArray.hasOwnProperty(key) && key == postData?.types) {
                                verifyStatusArray[key].status = postData?.status;
                                verifyStatusArray[key].datetime = `${ await this.getCurrentDateTime()}`;
                                verifyStatusArray[key].ad_user_id = `${loged_user_id}`;
                                verifyStatusArray[key].ad_user_name = `${loged_user_name}`;
                            }
                        }
                    }
                    let apprvalSatusArray = Object.values(verifyStatusArray).map(item => item['status']);
                    let apprvalSatusFilArray = apprvalSatusArray.filter(status => status !== 0 && status !== "0");
                    let apprvalSatusFArray = [...new Set(apprvalSatusArray)];;
                    let rejectCount = apprvalSatusArray.filter(element => element === '3').length;
                    if(apprvalSatusFArray.length == 1 && apprvalSatusFArray[0] == 2){
                        postData.approval_status = 2;
                        postData.approval_status_data =  JSON.stringify(verifyStatusArray);
                    }else if(apprvalSatusFArray.length == 1 && apprvalSatusFArray[0] == 3){
                        postData.approval_status = 3;
                        postData.approval_status_data =  JSON.stringify(verifyStatusArray);
                    }else if(apprvalSatusFArray.length > 1 && apprvalSatusFilArray.length == 9 && rejectCount > 0){
                        postData.approval_status = 3;
                        postData.approval_status_data =  JSON.stringify(verifyStatusArray);
                    }else{
                        postData.approval_status_data =  JSON.stringify(verifyStatusArray);
                    }
                    postData.updated_by = req.tokenUser?.id;
                    let resMessage = '';
                    const statusVal = postData?.status != null ? String(postData.status) : '';
                    if(statusVal === '2'){
                        resMessage = postData?.source == 'all' ? 'Campaign request approved successfully.' : 'Campaign request item approved successfully.';
                    } else if(statusVal === '3'){
                        resMessage = postData?.source == 'all' ? 'Campaign request rejected successfully.' : 'Campaign request item rejected successfully.';
                    } else {
                        resMessage = 'Campaign request verification updated successfully.';
                    }
                    delete(postData?.status);
                    delete(postData?.types);
                    delete(postData?.source);
                    await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, postData));
                    return res.status(HttpStatus.CREATED).json({
                        statusCode: 201,
                        success: 1,
                        error: 0,
                        data: [],
                        message: resMessage,
                    });
                }else{
                    throw new Error('Sorry! You are not authorized to access this campaign.');
                }
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
    @Post('change-status')
    async changesStatus(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.hash || (postData?.status == undefined || postData?.status == null)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const loged_role_id = req.tokenUser?.role_id;
            const loged_user_id = req.tokenUser?.id;
            const loged_org_id = req.tokenUser?.org_id;
            const loged_user_name = req.tokenUser?.first_name + ' ' + req.tokenUser?.last_name;
            let getCampaignDetails = null;
            if(postData?.id && postData?.hash){
                getCampaignDetails = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, {id : postData?.id, hash : postData?.hash}));
            }
            if(postData?.id && postData?.hash && getCampaignDetails !== null && getCampaignDetails !== undefined){
                let campRoleIdArr = [];
                if(loged_role_id == 40){
                    campRoleIdArr = [loged_role_id];
                }else if(loged_role_id == 39){
                    campRoleIdArr = [loged_role_id,40,11];
                }else if(loged_role_id == 38){
                    campRoleIdArr = [loged_role_id,40,39,11];
                }else{
                    campRoleIdArr = [loged_role_id,38,39];
                }
                let accessStatus = 1;
                const cam_role_id = getCampaignDetails['role_id'];
                const cam_org_id = getCampaignDetails['for_org_id'];
                if(campRoleIdArr.includes(cam_role_id)){
                    accessStatus = 0;
                }
                if(loged_role_id == 11 && cam_org_id != loged_org_id){
                    accessStatus = 1;
                }
                if(accessStatus == 0){
                    if(postData?.status === '2'){
                        if(getCampaignDetails['request_status'] == '4' || getCampaignDetails['request_status'] == '0'){
                            delete(postData?.hash);
                            let statusChangeDatas = await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, postData));
                            if(getCampaignDetails['with_option'] == 2 && getCampaignDetails['group_id'] != 0){
                                postData.parent_id = postData?.id;
                                delete(postData?.id);
                                statusChangeDatas = await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, postData));
                            }
                            if(statusChangeDatas && statusChangeDatas !== null && statusChangeDatas !== undefined && statusChangeDatas != 0){
                                return res.status(HttpStatus.OK).json({
                                    statusCode: 200,
                                    success: 1,
                                    error: 0,
                                    data: [],
                                    message: 'Email campaign successfully deleted.',
                                });
                            }else{
                                throw new Error('Sorry! Request is not deleted.');
                            }
                        }else{
                            throw new Error('Sorry! this request is go to in-progress so you have not deleted.');
                        }
                    }else if(postData?.status === '3'){
		    throw new Error('This functionality is in-progress');
                        if(getCampaignDetails['request_status'] == '1'){
                            let inProgressScheduleCheck = {};
                            if(getCampaignDetails['with_option'] == '2' && getCampaignDetails['group_id'] != 0){
                                inProgressScheduleCheck = await lastValueFrom(this.client.send({ cmd: 'check_campaign_schedule_datas' }, [postData, 'group']));
                            }else{
                                inProgressScheduleCheck = await lastValueFrom(this.client.send({ cmd: 'check_campaign_schedule_datas' }, [postData, 'single']));
                            } 
                        }else{
                            throw new Error("Sorry! This request is completed / not started so you can't pause this campaign.");
                        }
                    }
                }else{
                    throw new Error('Sorry! You are not authorized to access this campaign.');
                }
            }else{
                throw new Error('Sorry! Campaign is not found.');
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
    @Post('list')
    async find(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let where = {};
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'list_campaign_requests' }, where));
            if (campaignRequests.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignRequests = <any>(await this.commonArrayService.formatToDto(CommunicationEmailCampaignRequestsDto, campaignRequests, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: campaignRequests,
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
    @Post('get-email-contacts')
    async getEmailContects(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id && !postData?.hash) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const limit = postData?.limit || 25;
            const page = postData?.page || 1;
            const where = { id: postData?.id , hash: postData?.hash };
            let campaignRequests = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, where));
            if (!campaignRequests) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            campaignRequests = <any>(await this.commonArrayService.formatToDto(CommunicationEmailCampaignRequestsDto, campaignRequests, req.lang));
            let contactList = {};
            if(campaignRequests && campaignRequests !== null && campaignRequests !== undefined){
                if(campaignRequests.with_option == '0' && campaignRequests.file){
                    contactList['list'] = await this.csvService.getData(page, limit, `${appConstant.COMUNICATION_CAMPAIGN_FILE_PATH}/${campaignRequests.id}/${campaignRequests.file}`,campaignRequests.sheet_header);
                    const totalRecords = await this.csvService.getTotalRecords(`${appConstant.COMUNICATION_CAMPAIGN_FILE_PATH}/${campaignRequests.id}/${campaignRequests.file}`);
                    const totalPages = Math.ceil(totalRecords / limit);
                    contactList['total'] = totalRecords;
                    contactList['pages'] = totalPages;
                    contactList['page'] = page;
                    contactList['limit'] = parseInt(limit);
                }else if(campaignRequests.with_option == '1' && campaignRequests.for_org_id && campaignRequests.for_org_id !== null && campaignRequests.for_org_id !== undefined){
                    const orgFilertDatas = JSON.parse(campaignRequests.org_filter_data);
                    contactList['list'] = await this.userFileterData('multiple', campaignRequests.for_org_id, orgFilertDatas, page, limit);
                    const totalRecords = await this.userFileterData('count', campaignRequests.for_org_id, orgFilertDatas);
                    const totalPages = Math.ceil(totalRecords / limit);
                    contactList['total'] = parseInt(totalRecords);
                    contactList['pages'] = totalPages;
                    contactList['page'] = parseInt(page);
                    contactList['limit'] = parseInt(limit);
                }else if(campaignRequests.with_option == '2' && campaignRequests.group_id && campaignRequests.group_id !== null && campaignRequests.group_id !== undefined){
                    const orgFilertDatas = JSON.parse(campaignRequests.org_filter_data);
                    contactList['list'] = await this.userFileterData('multiple', campaignRequests.for_org_id, orgFilertDatas, page, limit);
                    const totalRecords = await this.userFileterData('count', campaignRequests.for_org_id, orgFilertDatas);
                    const totalPages = Math.ceil(totalRecords / limit);
                    contactList['total'] = parseInt(totalRecords);
                    contactList['pages'] = totalPages;
                    contactList['page'] = parseInt(page);
                    contactList['limit'] = parseInt(limit);
                }
            }
            if (Object.keys(contactList).length === 0) {
               
            }
            if (contactList['list'] && Array.isArray(contactList['list']) && contactList['list'].length > 0) {
               
                contactList['list'].forEach((record: any, index: number) => {
                    const values = Object.values(record || {});
                    const nonEmptyValues = values.filter((val: any) => val != null && String(val).trim() !== '');
                   
                });
                contactList['list'] = contactList['list'].filter((record: any, index: number) => {
                    const values = Object.values(record || {});
                    const hasValidData = values.some((val: any) => val != null && String(val).trim() !== '');
                    if (!hasValidData) {
                       
                    }
                    return hasValidData;
                });
                
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: contactList,
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
    @Post('get-from-emails')
    async getFromEmails(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let where = "communication.source = 0 AND communication.status = 1 AND communication.id != 1";
            let fromEmails = await lastValueFrom(this.client.send({ cmd: 'list_email_configs' }, where));
            if (fromEmails.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            fromEmails = <any>(await this.commonArrayService.formatToDto(CommunicationEmailConfigDto, fromEmails, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: fromEmails,
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
    @Post('get-default-templates')
    async getDefaultTemplates(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            let where = '';
            const roles = [38, 39];
            const orgId = postData?.for_org_id;
            if(postData?.with_option === '0' && roles.includes(req.tokenUser?.role_id)){
                where = `communication.temp_type IN (1,2) AND communication.status = 1 AND communication.go_type IN (0,1)`;
            }else if(postData?.with_option === '0'){
                where = `communication.temp_type IN (1,2) AND communication.status = 1 AND communication.go_type IN (0)`;
            }else if(postData?.with_option === '1' || postData?.with_option === '2'){
                where = `communication.org_id IN (0,${orgId}) AND communication.status = 1 AND communication.go_type IN (0,1)`;
            }
            let defaultTepmlates = await lastValueFrom(this.client.send({ cmd: 'list_campaign_templates' }, where));
            if (defaultTepmlates.length === 0) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            defaultTepmlates = <any>(await this.commonArrayService.formatToDto(CommunicationEmailCampaignTemplatesDto, defaultTepmlates, req.lang));
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: defaultTepmlates,
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
    @Post('get-default-template-items')
    async getDefaultTemplateItems(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            if (!postData?.id || !postData?.template_type || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = { id: postData?.id };
            let defaultTepmlates = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_templates' }, where));
            if (!defaultTepmlates && defaultTepmlates === null) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_DATA_NOT_FOUND'));
            }
            let itemDatas = {};
            const templateType = ['3','4','5','6','7'];
            if(templateType.includes(postData?.template_type)){
                if(postData?.template_type == 3 || postData?.template_type == 7){
                    let challengeWhere = `sc.status = 1 AND ch.challenge_type IN ('A','B','H') AND sc.org_id = ${postData?.org_id}`;    
                    const challengeData = await this.scheduleChallengeService.listRecord(challengeWhere);
                    if (!challengeData  && challengeData === null) {
                        throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_DATA_NOT_FOUND'));
                    } 
                    challengeData.forEach(challengess => {
                        challengess.custom_cname = ` ${challengess['challenge']['challenge_type']} - ${challengess.custom_cname.trim()}`;
                        delete(challengess['challenge']);
                    });
                    itemDatas['datas'] = challengeData;
                    itemDatas['tags'] = ['Challenge Name','Start Date','End Date','Registration Start Date','Registration End Date'];
                }else if(postData?.template_type == 5){
                    const companyCode = await this.companyService.getCompanyCodeFromId(postData?.org_id);
                    let where: any = { organization_id: companyCode, status: 1 };
                    let quizeItems = await this.quizAssignQuizOrgService.orgQuizListRecord(['aqo.id','quiz.id', 'quiz.quiz_name'],where, null,[tableConstant.QUIZ.TBL_QZ_QUIZZES])
                    const quizzes = quizeItems.filter(item => item['quiz'] !== null).map(item => item['quiz']);
                    itemDatas['datas'] = quizzes;
                    itemDatas['tags'] = ['Quiz Name','Start Date','End Date'];
                }else if(postData?.template_type == 4){
                    let where: any = { status: Not(2) };
                    where.organization_id = postData?.org_id;
                    const order = 'ASC';
                    const orderBy = 'end_date';
                    let campaignDatas = await this.campaignService.listRecord(where, { [orderBy]: order });
                    if(campaignDatas && campaignDatas.length){
                        await Promise.all(campaignDatas.map(async (ele)=>{
                            if(ele.campaign_name){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${ele['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${ele['organization_id']}`,`dynamic`);
                                ele.campaign_name = (customName == '' || customName == `campaign_name_${ele['id']}`) ? ele['campaign_name'] : customName;
                            }
                            if(ele.tab_titled){
                                let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_tab_titled_${ele['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${ele['organization_id']}`,`dynamic`);
                                ele.tab_titled = (customName == '' || customName == `campaign_tab_titled_${ele['id']}`) ? ele['tab_titled'] : customName;
                            }
                        }));
                    }
                    itemDatas['datas'] = campaignDatas;
                    if(defaultTepmlates.details_type == 0){
                        itemDatas['tags'] = ['Campaign Name','Start Date','End Date','Reward Details'];
                    }else if(defaultTepmlates.details_type == 1){
                        itemDatas['tags'] = ['Campaign Name','Start Date','End Date','Campaign Summary'];
                    }else{
                        itemDatas['tags'] = ['Campaign Name','Start Date','End Date','Reward Wise Winner Users'];
                    }
                }else if(postData?.template_type == 6){
                    let where = { organization_id: postData?.org_id, status: 1 };
                    let resultedData = await this.eventGlobalEventsService.globalEventIds(["id","event_id"],where);
                    let evWhere = `event.status = 1 AND event.event_type IN (0,2)`;
                    if(resultedData && resultedData !== null){
                        const globalEventIds = resultedData.map(item => item.event_id);
                        evWhere += ` AND ((event.organization_id = ${postData?.org_id}) OR (event.id IN (${globalEventIds})))`;
                    }else{
                        evWhere += ` AND event.organization_id = ${postData?.org_id}`;
                    }
                    const order = 'ASC';
                    const orderBy = 'event.id';
                    let eventDatas = await this.eventService.listRecord(["id", "event_name"],evWhere, { [orderBy]: order });
                    await Promise.all(resultedData['list'].map(async (ele)=>{
                        if(ele.event_name){
                            let customName = await this.translatorService.frontendReadTranslation(req.lang,`event_name_${ele['id']}`, `/LC_MESSAGES/Events/Events/${ele['org_id']}/${ele['id']}`,`dynamic`);
                            ele.event_name = (customName == '' || customName == `event_name_${ele['id']}`) ? ele['event_name'] : customName;
                        }
                    }));
                    itemDatas['datas'] = eventDatas;
                    itemDatas['tags'] = ['Event Name','Start Date','End Date','Address'];
                }   
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: itemDatas,
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
    @Post('get-default-template-sub-items')
    async getDefaultTemplateSubItems(@Req() req: Request, @Res() res: Response, @Body() postData: any){
        try {
            if (!postData?.template_type || !postData?.item_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let itemDatas = {};
            const templateType = ['4'];
            if(templateType.includes(postData?.template_type)){
                if(postData?.template_type == 4){
                    let where: any = { campaign_id: postData?.item_id, status : Not(2) };
                    where.organization_id = postData?.org_id;
                    const order = 'ASC';
                    const orderBy = 'order_id';
                    let campaignDatas = await this.campaignRewardService.listRecord(where, { [orderBy]: order },['id','reward_name']);
                    itemDatas['datas'] = campaignDatas;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: itemDatas,
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
    @Post('download-sample-file')
    async downloadSampleFile(@Req() req: Request, @Res() res: Response) {
        try {
            const headerRow = 'Name,Email,Mobile Number,Date of Birth,Address';
            const sampleRow = 'Test User,testmail@mailinator.com,1234567890,11-12-2022,Test Address';
            const csvRows = [headerRow, sampleRow];
            const csvContent = csvRows.join('\n');
            const base64Data = Buffer.from(csvContent, 'utf-8').toString('base64');

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {
                    excel_data: base64Data,
                    sheet_name: 'Campaign-Sample-csv',
                    extension: 'csv',
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
    @Post('copy')
    async copyCampaign(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.hash) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const loged_role_id = req.tokenUser?.role_id;
            const loged_org_id = req.tokenUser?.org_id;
            const sourceCampaign = await lastValueFrom(this.client.send({ cmd: 'get_one_campaign_requests' }, { id: postData?.id, hash: postData?.hash }));
            if (!sourceCampaign || sourceCampaign === null || sourceCampaign === undefined) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_RECORD_NOT_FOUND'));
            }
            if (sourceCampaign.status == 2) {
                throw new Error('Sorry! Cannot copy a deleted campaign.');
            }
            let campRoleIdArr = [];
            if (loged_role_id == 40) {
                campRoleIdArr = [loged_role_id];
            } else if (loged_role_id == 39) {
                campRoleIdArr = [loged_role_id, 40, 11];
            } else if (loged_role_id == 38) {
                campRoleIdArr = [loged_role_id, 40, 39, 11];
            } else {
                campRoleIdArr = [loged_role_id, 38, 39];
            }
            const cam_role_id = sourceCampaign['role_id'];
            const cam_org_id = sourceCampaign['for_org_id'];
            let accessStatus = 1;
            if (campRoleIdArr.includes(cam_role_id)) {
                accessStatus = 0;
            }
            if (loged_role_id == 11 && cam_org_id != loged_org_id) {
                accessStatus = 1;
            }
            if (accessStatus == 1) {
                throw new Error('Sorry! You are not authorized to copy this campaign.');
            }
            const copyData: any = {
                campaign_title: 'Copy - ' + (sourceCampaign.campaign_title || 'Campaign'),
                with_option: sourceCampaign.with_option,
                for_org_id: sourceCampaign.for_org_id,
                group_id: sourceCampaign.group_id || 0,
                sheet_header: sourceCampaign.sheet_header,
                org_filter_data: sourceCampaign.org_filter_data,
                subject: sourceCampaign.subject,
                template_content: sourceCampaign.template_content,
                template_type: sourceCampaign.template_type || 0,
                details_type: sourceCampaign.details_type || 0,
                use_def_tem_id: sourceCampaign.use_def_tem_id || 0,
                template_item_id: sourceCampaign.template_item_id || 0,
                template_item_sub_id: sourceCampaign.template_item_sub_id || 0,
                attachment: sourceCampaign.attachment,
                test_mail_user_data: sourceCampaign.test_mail_user_data,
                test_user_id: sourceCampaign.test_user_id,
                test_user_role: sourceCampaign.test_user_role,
                from_email_id: sourceCampaign.from_email_id,
                interval_from: sourceCampaign.interval_from,
                interval_to: sourceCampaign.interval_to,
                testemail: sourceCampaign.testemail,
                status: 1,
                request_status: 0,
                approval_status: 0,
                approval_status_data: '',
                schedule_utc_datetime: sourceCampaign.schedule_utc_datetime || String(Date.now()),
                sendtestmailstatus: 0,
                parent_id: 0,
                created_by: req.tokenUser?.id,
                role_id: req.tokenUser?.role_id,
            };
            const campaignDatas = await lastValueFrom(this.client.send({ cmd: 'create_campaign_requests' }, copyData));
            if (!campaignDatas || !campaignDatas['identifiers'] || campaignDatas['identifiers'].length === 0) {
                throw new Error('Failed to create campaign copy.');
            }
            const lastInsertId = campaignDatas['identifiers'][0]['id'];
            const lastInsertHash = `${this.commonService.generateMD5(lastInsertId.toString())}`;
            const updateData: any = { id: lastInsertId, hash: lastInsertHash };
            if (sourceCampaign.with_option == '0' && sourceCampaign.file) {
                const sourceFilePath = path.join(appConstant.COMUNICATION_CAMPAIGN_FILE_PATH, String(sourceCampaign.id), sourceCampaign.file);
                const fileExt = pathInfo.extname(sourceCampaign.file).toLowerCase() || '.csv';
                const newFileName = `${lastInsertHash}${fileExt}`;
                const destFolder = path.join(appConstant.COMUNICATION_CAMPAIGN_FILE_PATH, String(lastInsertId));
                const destFilePath = path.join(destFolder, newFileName);
                try {
                    const fsI = require('fs-extra');
                    await fsI.ensureDir(destFolder);
                    const copied = await this.commonFileService.copyFile(sourceFilePath, destFilePath);
                    if (copied) {
                        updateData['file'] = newFileName;
                    }
                } catch (fileErr) {
                    // File copy failed - updateData['file'] will not be set
                }
            }
            await lastValueFrom(this.client.send({ cmd: 'update_campaign_requests' }, updateData));
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: { id: lastInsertId, hash: lastInsertHash, campaign_title: copyData.campaign_title },
                message: 'Campaign copied successfully.',
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

    async userFileterData(type: string, con_id: any = null, filterData: any = null, pageid: number = null, limit: number = null){
        try{
            
            if(type == 'single'){
                let whereCon = `user.id = '${con_id}' `;
                return await this.userService.userFilerForCampaign(type, whereCon);
            }else if(type == 'multiple' || type == 'testUser' || type == 'count' || type == 'multipleIds'){
                const companyCode = await this.companyService.getCompanyCodeFromId(con_id);
                let whereCon = `user.membership_code = '${companyCode}' `;
                
                if(filterData && filterData !== null && filterData !== undefined){
                    if(filterData.terminated && filterData.terminated != '' && filterData.terminated !== null && filterData.terminated !== undefined && filterData.terminated == 1){
                        whereCon += ` AND user.status = 1`;
                    }
                    if(filterData.department && filterData.department != '' && filterData.department !== null && filterData.department !== undefined){
                        whereCon += ` AND user.department_id IN (${filterData.department})`;
                    }
                    if(filterData.location && filterData.location != '' && filterData.location !== null && filterData.location !== undefined){
                        whereCon += ` AND user.location IN (${filterData.location})`;
                    }
                    if(filterData.on_health_plan && filterData.on_health_plan == 1){
                        whereCon += ` AND user.on_insurance_plan = 'Yes'`;
                        if(filterData.health_plan_name && filterData.on_health_plan != ''&& filterData.on_health_plan !== null && filterData.on_health_plan !== undefined){
                            whereCon += ` AND user.insurance_plan_name IN (${filterData.health_plan_name})`;
                        }
                    } else if(filterData.on_health_plan && filterData.on_health_plan == 0){
                        whereCon += ` AND user.on_insurance_plan = 'No'`;
                    }
                    if(filterData.gender && filterData.gender != 'all'){
                        whereCon += ` AND user.gender IN ('${filterData.gender}')`;
                    }
                    if (filterData.SearchEmail && filterData.SearchEmail !== '') {
                        whereCon += ` AND user.email LIKE '%${filterData.SearchEmail}%' `;
                        whereCon += ` AND (user.email NOT LIKE '%@preventioncloud.com%' AND user.email NOT LIKE '%__DELETED%') `;
                    } else {
                        whereCon += ` AND (user.email NOT LIKE '%@preventioncloud.com%' AND user.email NOT LIKE '%__DELETED%') `;
                    }
                    if (filterData.eligibility && filterData.eligibility != '') {
                        if(filterData.eligibility == 7){
                            whereCon += ` AND user.role_id = 2 `;
                        }else if(filterData.eligibility == 8){
                            whereCon += ` AND user.role_id = 16 `;
                        }else if(filterData.eligibility == 1){
                            whereCon += ` AND user.role_id IN (2,16) AND user.is_camp_eligible = 1 `;
                        }else if(filterData.eligibility == 2){
                            whereCon += ` AND user.role_id IN (2,16) AND user.is_camp_eligible = 0 `;
                        }else if(filterData.eligibility == 3){
                            whereCon += ` AND user.role_id = 2 AND user.is_camp_eligible = 1 `;
                        }else if(filterData.eligibility == 4){
                            whereCon += ` AND user.role_id = 2 AND user.is_camp_eligible = 0 `;
                        }else if(filterData.eligibility == 5){
                            whereCon += ` AND user.role_id = 16 AND user.is_camp_eligible = 1 `;
                        }else if(filterData.eligibility == 6){
                            whereCon += ` AND user.role_id = 16 AND user.is_camp_eligible = 0 `;
                        }else{
                            whereCon += ` AND user.role_id IN (2,16) `;
                        }
                    }else{
                        whereCon += ` AND user.role_id IN (2,16) `;
                    }
                }else{
                    whereCon += ` AND user.role_id IN (2,16) `;
                }
           
                const result = await this.userService.userFilerForCampaign(type, whereCon, pageid, limit);
                return result;
            }else if(type == 'GroupTestUser'){
                let OrgIdArr = con_id.map(item => `'${item}'`);
                let whereCon = `user.membership_code IN (${OrgIdArr}) AND user.role_id IN (2,16) AND user.status = 1`;
                return await this.userService.userFilerForCampaign(type, whereCon);
            }
        }catch(err){
            throw new Error(err.message);
        }
    }
    async convertToIndexedObject(obj) {
        try{
            if (!obj) {
                return [];
            }
            const result = [];
            const values = Object.values(obj);
            values.forEach((value, index) => {
                result.push(String(value));
            });
            return result;
        }catch(err){
            console.log('err',err);
            throw new Error(err.message);
        }
    }
    async getSurroundingValues(arr, target) {
        try{
            const index = arr.indexOf(target);
            if (index === -1) {
            return {
                previous: null,
                next: null,
            };
            }
            const previous = index > 0 ? arr[index - 1] : null;
            const next = index < arr.length - 1 ? arr[index + 1] : null;
            return {
            previous,
            next,
            };
        }catch(err){
            throw new Error(err.message);
        }
    }
    async getCurrentDateTime() {
        try{
            const now = new Date();
            let year = now.getFullYear();
            let month = ('0' + (now.getMonth() + 1)).slice(-2); // Months are zero based
            let day = ('0' + now.getDate()).slice(-2);
            let hours = ('0' + now.getHours()).slice(-2);
            let minutes = ('0' + now.getMinutes()).slice(-2);
            let seconds = ('0' + now.getSeconds()).slice(-2);
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }catch(err){
            throw new Error(err.message);
        }
    }
}