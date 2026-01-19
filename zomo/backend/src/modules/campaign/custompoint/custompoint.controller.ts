import { RequestDeleteCustomPointInput } from "@/modules/campaign/custompoint/input/request-delete-custom-point.input";
import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, CustomPointDto, CustomPointRequestDto, tableConstant } from '@common-constants';
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
} from "@nestjs/common";
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from "express";
import * as md5 from 'md5';
import { diskStorage } from 'multer';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { In, Not } from "typeorm";
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import { RateLimiterMiddleware } from "../../../middleware/rate-limiter.middleware";
import { fileFilter, fileName } from '../../../utils/image-upload.utils';
import { CampaignService } from "../campaign/campaign.service";
import { FrontService } from "../front/front.service";
import { PaginateWithCampaignInput } from '../input';
import { CustomPointService } from "./custompoint.service";
import { CreateCustomPointInput, MappingCustomPointInput, UploadCustomPointInput } from './input';
@Controller('campaign/custom-point')
@UseGuards(TokenGuard, RoleGuard)
export class CustomPointController {
    constructor(
        private readonly customPointService: CustomPointService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly frontService: FrontService,
        private readonly campaignService: CampaignService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        @Inject('CRON_SERVICE')
        private cronMicroService: ClientProxy,
    ) {}
    @UseGuards(AccessGuard)
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCampaignInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user =  req.tokenUser;
            let org_id = user.org_id;
            if(postData?.org_id){
                org_id = postData?.org_id;
            }
            let where = ` custompoint.status = 1`;
            if(user.role_id == appConstant.ROLE.BROKERADMIN || user.role_id == appConstant.ROLE.BROKER || user.role_id == appConstant.ROLE.REGIONALADMIN){
                let checkBrokerAdmin = [];
                if(user.role_id == appConstant.ROLE.BROKERADMIN){
                    checkBrokerAdmin = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.user_id = ${user.id} AND broker.is_global = 1`);
                }else if(user.role_id == appConstant.ROLE.REGIONALADMIN){
                    checkBrokerAdmin = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.user_id = ${user.id} AND broker.is_global = 2`);
                }else if(user.role_id == appConstant.ROLE.BROKER){
                    checkBrokerAdmin = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.broker_admin_id = ${user.id}`);
                }
                if(checkBrokerAdmin.length == 0){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
                }
            }
            if(user.role_id == appConstant.ROLE.COACH){
                where += ` AND custompoint.added_by IN (${user?.id})`;
            }else{
                where += ` AND custompoint.org_id = ${org_id}`;
            }
            if(user.role_id == appConstant.ROLE.WCH){
                let getChampaignUsers = await this.customPointService.usersDataWellness(user);
                if(getChampaignUsers.length > 0){
                    const userIdsString = getChampaignUsers.map(user => user.id).join(',');
                    where += ` AND custompoint.user_id IN (${userIdsString})`;
                }else{
                    where += ` AND custompoint.user_id = 0`;
                }
            }
            if(postData?.request_id){
                if(user.role_id == appConstant.ROLE.COACH){
                    where += ` AND custompoint.request_id IN (${postData?.request_id})`;
                }else{
                    where += ` AND custompoint.added_by = ${user?.id} AND custompoint.request_id = ${postData?.request_id}`;
                }
            }
            if(postData?.search_type == 'userId'){
                where += ` AND user.code = '${postData?.search_str}'`;
            }else if(postData?.search_type == 'userName'){
                where += ` AND user.username LIKE '%${postData?.search_str}%'`;
            }else if(postData?.search_type == 'fullName'){
                where += ` AND custompoint.user_name LIKE '%${postData?.search_str}%'`;
            }else if(postData?.search_type == 'activityName'){
                where += ` AND custompoint.activity_name LIKE '%${postData?.search_str}%'`;
            }else if(postData?.search_type == 'point'){
                where += ` AND custompoint.point LIKE '%${postData?.search_str}%'`;
            }else if(postData?.search_type == 'rewardName'){
                where += ` AND campaignreward.reward_name LIKE '%${postData?.search_str}%'`;
            }
            if(postData?.date){
                where += ` AND DATE(custompoint.created_date) = '${await this.commonDateService.DateTimeFormat(postData?.date, 'YYYY-MM-DD','MM-DD-YYYY')}'`;
            }
            const resultedData = await this.customPointService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CustomPointDto, resultedData['list'], req.lang)
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCustomPointInput) {
        try {
            if (!postData?.org_id || !postData?.selected_users || !postData?.campaign_id || !postData?.activity_ids || !postData?.points || !postData?.date) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user =  req.tokenUser;
            let userDatas = [];
            if(postData?.selected_users){
                if(postData?.selected_users == 'all'){
                    let where = ` user.status = 1 AND user.org_id = ${postData?.org_id}`;
                    if(user.role_id == appConstant.ROLE.WCH){
                        let getChampaignUsers = await this.customPointService.usersDataWellness(user);
                        if(getChampaignUsers.length > 0){
                            const userIdsString = getChampaignUsers.map(user => user.id).join(',');
                            where += ` AND user.id IN (${userIdsString})`;
                        }else{
                            where += ` AND user.id = 0`;
                        }
                    }
                    userDatas = await this.customPointService.getUsers(where,['user.id','user.first_name','user.last_name']);
                }else{
                    let where = ` user.id IN (${postData?.selected_users}) AND user.status = 1 AND user.org_id = ${postData?.org_id}`;
                    userDatas = await this.customPointService.getUsers(where,['user.id','user.first_name','user.last_name']);
                }
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Please select atlest one user"))+'.';
            }
            let activitysDatas = [];
            if(postData?.activity_ids){
                activitysDatas = await this.frontService.campaignActivityData(['campaign_activity.id','campaign_activity.cust_name','activity.activity_name'],{id: In(postData?.activity_ids.split(',')),status: 1,campaign_id: postData?.campaign_id},null,[{'join_table': 'campaign_activity.activity','alias':'activity', 'table' : tableConstant.ACTIVITIES.TBL_ACTIVITIES, 'on_condition' : `campaign_activity.activity_id = activity.id`, 'join_type': 'left_one' }],'getMany');
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Please select atlest one activity"))+'.';
            }
            if(userDatas.length > 0){
                let i = 0;
                let insertData = [];
                for (let users of userDatas){
                    for (let activitys of activitysDatas){
                        let point = postData?.points;
                        let activity_id = activitys.id;
                        let data = {
                            user_id: users.id,
                            user_name: users.full_name,
                            org_id: postData?.org_id,
                            activity_id: activity_id,
                            activity_name: activitys?.cust_name || activitys?.activity?.activity_name,
                            point: point,
                            date: await this.commonDateService.DateTimeFormat(postData?.date, 'YYYY-MM-DD','MM-DD-YYYY'),
                            status: 1
                        }
                        insertData.push(data);
                    }
                }
                if(insertData.length > 0){
                    await this.customPointService.save(insertData);
                }
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_USER_NOT_FOUND"));
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'All_records_successfully_inserted', `/LC_MESSAGES/Campaign/Campaigns`,`static`)+'.',
            });
        } catch (error) {
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
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCustomPointInput) {
        try {
            if (!postData?.id || !postData?.user_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, user_id: postData?.user_id, status: Not(2) };
            let campaignDetails = await this.customPointService.findOne(where);
            if (!campaignDetails) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            await this.customPointService.update(
                { id: postData?.id },
                { status: 2 },
            );
            this.activityLogService.create(campaignDetails, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: await this.translatorService.frontendReadTranslation(req.lang, 'The_point_has_been_deleted', `/LC_MESSAGES/Campaign/Campaigns`,`static`)+'.',
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
    @Post('get-campaign-activitys')
    async getCampaignActivitys(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCustomPointInput) {
        try {
            if (!postData?.org_id || !postData?.campaign_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const campaignPlanCheck = await this.campaignService.findOne({
                id: postData?.campaign_id, status: Not(2), organization_id: postData?.org_id
            });
            if (!campaignPlanCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            let result = await this.frontService.campaignActivityData(['campaign_activity.id','campaign_activity.campaign_id','campaign_activity.activity_id','campaign_activity.cust_name','activity.activity_name'],{status: 1,campaign_id: postData?.campaign_id},{ 'campaign_activity.id' : 'ASC' },[{'join_table': 'campaign_activity.activity','alias':'activity', 'table' : tableConstant.ACTIVITIES.TBL_ACTIVITIES, 'on_condition' : `campaign_activity.activity_id = activity.id`, 'join_type': 'left_one' }],'getMany');
            for (let datas of result) {
                if(datas.cust_name == ''){
                    datas.cust_name = datas['activity']['activity_name'];
                }
                delete datas['activity'];
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success',
            });
        } catch (error) {
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
    @Post('get-org-users')
    async getOrgUsers(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCustomPointInput) {
        try {
            if (!postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user =  req.tokenUser;
            let where = ` user.status = 1 AND user.org_id = ${postData?.org_id}`;
            if(user.role_id == appConstant.ROLE.WCH){
                let getChampaignUsers = await this.customPointService.usersDataWellness(user);
                if(getChampaignUsers.length > 0){
                    const userIdsString = getChampaignUsers.map(user => user.id).join(',');
                    where += ` AND user.id IN (${userIdsString})`;
                }else{
                    where += ` AND user.id = 0`;
                }
            }
            if (postData?.search_str) {
                where += ` AND (user.first_name LIKE '%${postData?.search_str}%' OR user.last_name LIKE '%${postData?.search_str}%')`;
            }
            let result = await this.customPointService.getUsers(where,['user.id','user.first_name','user.last_name']);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: result,
                message: 'success',
            });
        } catch (error) {
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
    @Post('download-templete')
    async downloadTemplete(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCustomPointInput) {
        try {
            if (!postData?.campaign_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let user =  req.tokenUser;
            let org_id = user.org_id;
            if(postData?.org_id){
                org_id = postData?.org_id;
            }
            let campaignId = postData?.campaign_id;
            if(user.role_id == appConstant.ROLE.BROKERADMIN || user.role_id == appConstant.ROLE.BROKER || user.role_id == appConstant.ROLE.REGIONALADMIN){
                let checkBrokerAdmin = [];
                if(user.role_id == appConstant.ROLE.BROKER){
                    checkBrokerAdmin = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.user_id = ${user.id} AND broker.is_global = 1`);
                }else if(user.role_id == appConstant.ROLE.REGIONALADMIN){
                    checkBrokerAdmin = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.user_id = ${user.id} AND broker.is_global = 2`);
                }else if(user.role_id == appConstant.ROLE.BROKERADMIN){
                    checkBrokerAdmin = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.broker_admin_id = ${user.id}`);
                }
                if(checkBrokerAdmin.length == 0){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
                }
            }
            let where = ` campaign.id = ${campaignId} AND campaign.status = 1 AND campaign.organization_id = ${org_id}`;
            let checkCampaign = await this.customPointService.getCampaignData(where);
            if (!checkCampaign) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            let checkReward = await this.customPointService.getRewardsData(`campaign_id = ${campaignId} AND status = 1`);
            if(checkReward.length == 0){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REWARD_NOT_FOUND"));
            }
            let headerData = appConstant.UPLOAD_POINT_HEADER;
            let activityData = {}
            for (let rewards of checkReward){
                let getActivities = await this.frontService.campaignActivityData(['campaign_activity.id','campaign_activity.cust_name','activity.activity_name'],{id: In(rewards.related_activity.split(',')),status: 1,campaign_id: campaignId},{'campaign_activity.required_by_spouse': "DESC",'campaign_activity.required_by_user': "DESC",'activity.activity_name': "ASC"},[{'join_table': 'campaign_activity.activity','alias':'activity', 'table' : tableConstant.ACTIVITIES.TBL_ACTIVITIES, 'on_condition' : `campaign_activity.activity_id = activity.id`, 'join_type': 'left_one' }],'getMany');
                if(getActivities.length > 0){
                    const activitiesLength = getActivities.length;
                    for (let i = 0; i < activitiesLength; i++) {
                        const activity: any = getActivities[i];
                        const name = activity?.cust_name || activity?.activity?.activity_name;
                        if (name) {
                            Object.assign(activityData, {
                                [name]: '',
                                [`${name}_Date`]: ''
                            });
                        }
                    }
                }
            }
            let userWhere = ` user.status = 1 AND user.org_id = ${org_id} AND user.role_id IN (2,16)`;
            if(user.role_id == appConstant.ROLE.WCH){
                let getChampaignUsers = await this.customPointService.usersDataWellness(user);
                if(getChampaignUsers.length > 0){
                    const userIdsString = getChampaignUsers.map(user => user.id).join(',');
                    userWhere += ` AND user.id IN (${userIdsString})`;
                }else{
                    userWhere += ` AND user.id = 0`;
                }
            }
            const joinTableList = [{'alias':'settings', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on' : `settings.user_id = user.id`, 'connect' : 'user', 'type' : 'INNER' }, {'alias':'department', 'table' : tableConstant.COMPANIES.TBL_DEPARTMENT, 'on' : `department.id = user.department_id` , 'connect' : 'user', 'type' : 'LEFT' }, {'alias':'location', 'table' : tableConstant.COMPANIES.TBL_LOCATION, 'on' : `location.id = user.location` , 'connect' : 'user', 'type' : 'LEFT' }, {'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = user.org_id` , 'connect' : 'user', 'type' : 'LEFT' },{'alias':'company_setting', 'table' : tableConstant.COMPANIES.TBL_COMPANY_SETTINGS, 'on' : `company_setting.org_id = user.org_id` , 'connect' : 'user', 'type' : 'LEFT' }];
            let getUsers = await this.customPointService.getUsers(userWhere,['user.id','user.code','user.username','user.first_name','user.middle_name','user.last_name','user.role_id','settings.jobtitle','user.employeeid','user.dob','user.on_insurance_plan','user.email','settings.wphone','settings.hphone', 'company.company_name','company_setting.spouse_option','department.dept_name','location.location_name','location.address1','location.address2','location.city','location.state','location.country','location.zip'],joinTableList);
            let jsonData: any[] = [];
            let companyName = '';
            if(getUsers.length > 0){
                for (let users of getUsers){
                    let country = users?.['location']?.['country'] || '';
                    let userDataRow = {
                        [headerData[0]] : users?.['company']['company_name'],
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
                    companyName = users?.['company']['company_name'];
                    jsonData.push(userDataRow)
                }
                const jsonString = JSON.stringify(jsonData, null, 2);
                let currnetDatetime = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD-HHmmss');
                let fileName:string = `${companyName.replace(/\s/g, "_")}_Point_Upload_Template_${currnetDatetime}.json`;
                /* TODO: remove extra file create code and add direct json to utf-8 to base64 data convert */
                let filePath:string = path.join(`${appConstant.CUSTOM_POINT_REQUEST_FILE_PATH}`);
                await this.commonFileService.dirIsExist(`${appConstant.CUSTOM_POINT_REQUEST_FILE_PATH}`);
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
    @Post('custom-point-upload')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: appConstant.FILE_SIZE },
            storage: diskStorage({
                destination: `${appConstant.CUSTOM_POINT_REQUEST_FILE_PATH}`,
                filename: fileName,
            }),
            fileFilter: fileFilter,
        }),
        AccessGuard
    )
    async customPointUpload(@Req() req: Request, @Res() res: Response, @Body() postData: UploadCustomPointInput, @UploadedFile() file: Express.Multer.File) {
        const rateLimiter = new RateLimiterMiddleware();
        await rateLimiter.use(req, res, async () => {
        try {
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
                if (!postData?.campaign_id || !file) {
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
                    campaign_id: Number(postData?.campaign_id),
                    original_file: file.filename,
                    org_sheet_header: postData.org_sheet_header,
                    status: 0,
                    created_by: req.tokenUser?.id,
                    updated_by: req.tokenUser?.id,
                    request_date: await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD HH:mm:ss'),
                }
                let createdRequest = await this.customPointService.saveRequest(requestData);
                if(createdRequest){
                    let hash = md5(createdRequest['id']);
                    if (file && file.fieldname === 'file' && file.filename) {
                        file.originalname = this.commonFileService.formatFileName(file.originalname);
                        file.filename = this.commonFileService.generateFileName('pointuploadfiles', createdRequest['id'].toString(), 'cpur_', file.originalname.split('.')[file.originalname.split('.').length - 1]);
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file.path),  filename: file.filename, userBucket: 'private'}));
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(filePath),  filename: file.filename.replace(/\.[^/.]+$/, '.json'),userBucket: 'private'}));
                        await this.customPointService.requestUpdate({ id: createdRequest['id'] },{ original_file: file.filename,hash: hash });
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
    @UseGuards(AccessGuard)
    @Post('mapping-data')
    async mappingData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingCustomPointInput) {
        try {
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let pointHeaderData: any = appConstant.UPLOAD_POINT_HEADER_DATA;
            let pointHeaderDataArray: string[] = Object.values(pointHeaderData)
            const where = { hash: postData?.id, org_id: postData?.org_id, created_by: postData.user_id, status: Not(2) };
            let recordDetails: any = await this.customPointService.requestFindOne(where,['custompointrequest.id','custompointrequest.org_id','custompointrequest.campaign_id','custompointrequest.org_sheet_header','custompointrequest.mapped_header','custompointrequest.status']);
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
            let checkReward = await this.customPointService.getRewardsData(`campaign_id = ${recordDetails?.campaign_id} AND status = 1`);
            if(checkReward.length == 0){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REWARD_NOT_FOUND"));
            }
            let dragZone: string[] = JSON.parse(recordDetails?.org_sheet_header);
            type KeyValueObject = {[index: string]: string};

            let autoMapped: KeyValueObject = {};
            const sanitizeString = (input: string) => input.replace(/\xEFBF/g, "").replace(/ /g, "").replace(/\*/g, "").toLowerCase();
            const mapAutoMapped = async (tempMap, dragZone, autoMapped) => {
                for (const [zoneIndex, zoneValue] of Object.entries(tempMap)) {
                    const zoneSanitized = sanitizeString(zoneValue.toString());
                    let matchIndex = '';

                    for (let dragIndex = 0; dragIndex < dragZone.length; dragIndex++) {
                        const dragSanitized = sanitizeString(dragZone[dragIndex]);
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
            let columnIndex = Number(pointHeaderDataArray.length) + 1;
            let dropZoneActivity: any = {};
            for (let rewards of checkReward){
                let getActivities = await this.frontService.campaignActivityData(['campaign_activity.id','campaign_activity.cust_name','activity.activity_name'],{id: In(rewards.related_activity.split(',')),status: 1,campaign_id: recordDetails?.campaign_id},{'campaign_activity.required_by_spouse': "DESC",'campaign_activity.required_by_user': "DESC",'activity.activity_name': "ASC"},[{'join_table': 'campaign_activity.activity','alias':'activity', 'table' : tableConstant.ACTIVITIES.TBL_ACTIVITIES, 'on_condition' : `campaign_activity.activity_id = activity.id`, 'join_type': 'left_one' }],'getMany');
                if (getActivities.length > 0) {
                    for (let i = 0; i < getActivities.length; i++) {
                        const activity = getActivities[i];
                        const label = activity?.cust_name || activity?.['activity']?.activity_name;
                        if (!label) continue;
                        const col1 = getExcelColumnName(columnIndex++);
                        const col2 = getExcelColumnName(columnIndex++);
                        const tempMap = {
                            [col1]: label,
                            [col2]: `${label}_Date`,
                        };
                        dropZoneActivity[label] = tempMap
                        await mapAutoMapped(tempMap, dragZone, autoMapped);
                    }
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
    @UseGuards(AccessGuard)
    @Post('save-mapping-data')
    async saveMappingData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingCustomPointInput) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id || !postData?.mapped_header) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { hash: postData?.id };
            const recordDetails = await this.customPointService.requestFindOne(where,['custompointrequest.id','custompointrequest.org_id','custompointrequest.campaign_id','custompointrequest.org_sheet_header','custompointrequest.mapped_header','custompointrequest.status']);
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
            await this.customPointService.requestUpdate(where, { mapped_header: postData.mapped_header, status: 3 });
            this.activityLogService.create(recordDetails, {mapped_header: postData.mapped_header, status: 3}, tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT_REQUEST, req.tokenUser?.id,'update');
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
    @Post('show-mapping-data')
    async showMappingData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingCustomPointInput) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let message = '';
            const recordDetails = await this.customPointService.requestFindOne({hash: postData?.id,status: '3'},['custompointrequest.org_id','custompointrequest.mapped_header','custompointrequest.original_file','custompointrequest.campaign_id','custompointrequest.org_sheet_header']);
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
            let pointHeaderData: any = appConstant.UPLOAD_POINT_HEADER_DATA;
            let pointHeaderDataArray: string[] = Object.values(pointHeaderData)
            const selectedMappedHeader: any = Object.fromEntries(
                Object.entries(mappedHeader).filter(([key, value]) => value !== "")
            );
            let checkReward = await this.customPointService.getRewardsData(`campaign_id = ${recordDetails?.campaign_id} AND status = 1`);
            if(checkReward.length == 0){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REWARD_NOT_FOUND"));
            }
            const getExcelColumnName = (index: number): string => {
                let name = '';
                while (index >= 0) {
                    name = String.fromCharCode((index % 26) + 65) + name;
                    index = Math.floor(index / 26) - 1;
                }
                return name;
            };
            let columnIndex = Number(pointHeaderDataArray.length) + 1;
            let dropZoneActivity: any = {};
            for (let rewards of checkReward){
                let getActivities = await this.frontService.campaignActivityData(['campaign_activity.id','campaign_activity.cust_name','activity.activity_name'],{id: In(rewards.related_activity.split(',')),status: 1,campaign_id: recordDetails?.campaign_id},{'campaign_activity.required_by_spouse': "DESC",'campaign_activity.required_by_user': "DESC",'activity.activity_name': "ASC"},[{'join_table': 'campaign_activity.activity','alias':'activity', 'table' : tableConstant.ACTIVITIES.TBL_ACTIVITIES, 'on_condition' : `campaign_activity.activity_id = activity.id`, 'join_type': 'left_one' }],'getMany');
                if (getActivities.length > 0) {
                    for (let i = 0; i < getActivities.length; i++) {
                        const activity = getActivities[i];
                        const label = activity?.cust_name || activity?.['activity']?.activity_name;
                        if (!label) continue;
                        const col1 = getExcelColumnName(columnIndex++);
                        const col2 = getExcelColumnName(columnIndex++);
                        const tempMap = {
                            [col1]: label,
                            [col2]: `${label}_Date`,
                        };
                        dropZoneActivity = {...dropZoneActivity, ...tempMap}
                    }
                }
            }
            let headerData = {...pointHeaderData, ...dropZoneActivity}
            let activityKey = Object.keys(dropZoneActivity);
            const defaultHeader = {};
            const keys = Object.keys(headerData);
            let mappedActivityCount = 0
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (selectedMappedHeader[key] !== undefined) {
                    defaultHeader[selectedMappedHeader[key]] = headerData[key];
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
            let activityCount = 0;
            const maxPreviewRows = 5;

            for (let i = 0; i < sheetDataCount; i++) {
                const row: Record<string, any> = {};
                for (const key in defaultHeader) {
                    const fieldName = defaultHeader[key];
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
    @UseGuards(AccessGuard)
    @Post('undo-request-data')
    async undoRequestData(@Req() req: Request, @Res() res: Response, @Body() postData: MappingCustomPointInput) {
        try {
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.customPointService.requestFindOne({hash: postData?.id},['custompointrequest.original_file','custompointrequest.success_file','custompointrequest.rejected_file','custompointrequest.status']);
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
            for (let i = 0; i < JsonData.length; i++) {
                idArray.push(JsonData[i].id);
            }
            await this.customPointService.update({id: In(idArray)},{status: '2'});
            let customPointRevert = {status: '0',success_file: null,rejected_file: null}
            await this.customPointService.requestUpdate({hash: postData?.id},customPointRevert);
            this.activityLogService.create(recordDetails, customPointRevert, tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT_REQUEST, req.tokenUser?.id,'update');
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
    @UseGuards(AccessGuard)
    @Post('import-cancel')
    async importCancel(@Req() req: Request, @Res() res: Response, @Body() postData: MappingCustomPointInput) {
        try {
            postData.user_id = postData?.user_id ?? req.tokenUser?.id;
            postData.org_id = postData?.org_id ?? req.tokenUser?.org_id;
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const recordDetails = await this.customPointService.requestFindOne({hash: postData?.id},['custompointrequest.org_id','custompointrequest.mapped_header','custompointrequest.original_file','custompointrequest.status']);
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
            await this.customPointService.requestUpdate({hash: postData?.id}, { status: '4' });
            this.activityLogService.create(recordDetails, { status: '4' }, tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT_REQUEST, req.tokenUser?.id,'update');
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
    @Post('request-paginate')
    async requestPaginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCampaignInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let user =  req.tokenUser;
            let org_id = user.org_id;
            if(postData?.org_id){
                org_id = postData?.org_id;
            }
            let where = ` custompointrequest.status != 2`;
            if(user.role_id == appConstant.ROLE.BROKER || user.role_id == appConstant.ROLE.BROKERADMIN || user.role_id == appConstant.ROLE.REGIONALADMIN){
                let checkBrokerAdmin = [];
                if(user.role_id == appConstant.ROLE.BROKER){
                    checkBrokerAdmin = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.user_id = ${user.id} AND broker.is_global = 1`);
                }else if(user.role_id == appConstant.ROLE.REGIONALADMIN){
                    checkBrokerAdmin = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.user_id = ${user.id} AND broker.is_global = 2`);
                }else if(user.role_id == appConstant.ROLE.BROKERADMIN){
                    checkBrokerAdmin = await this.customPointService.checkBrokerUser(`broker.org_id = ${org_id} AND broker.broker_admin_id = ${user.id}`);
                }
                if(checkBrokerAdmin.length == 0){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
                }
            }
            where += ` AND custompointrequest.created_by IN (${user?.id}) AND custompointrequest.org_id = ${org_id}`;
            if(postData?.date){
                where += ` AND DATE_FORMAT(custompointrequest.request_date,'%Y-%m-%d') = '${await this.commonDateService.DateTimeFormat(postData?.date, 'YYYY-MM-DD','MM-DD-YYYY')}'`;
            }
            const resultedData = await this.customPointService.paginateRequestList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CustomPointRequestDto, resultedData['list'], req.lang)
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
    @Post('request-delete')
    async requestDelete(@Req() req: Request, @Res() res: Response, @Body() postData: RequestDeleteCustomPointInput) {
        try {
            let user =  req.tokenUser;
            if (!postData?.id || !postData?.org_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, org_id: postData?.org_id, created_by: user.id, status: Not(2) };
            let requestDetails = await this.customPointService.requestFindOne(where);
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
            await this.customPointService.requestUpdate(
                { id: postData?.id, org_id: postData?.org_id, created_by: user.id, status: Not(2) },
                { status: 2 },
            );
            this.activityLogService.create(requestDetails, { status: 2 }, tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT_REQUEST, req.tokenUser?.id,'update');
            await this.customPointService.update(
                { request_id: postData?.id, org_id: postData?.org_id, added_by: user.id, status: Not(2) },
                { status: 2 },
            );
            this.activityLogService.create(requestDetails, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT, req.tokenUser?.id, 'delete');
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
    @UseGuards(AccessGuard)
    @Post('point-cron')
    async pointCron(@Req() req: Request, @Res() res: Response) {
        try {
            let uploadStopRequest = await this.customPointService.requestUpdate(`created < NOW() - INTERVAL 2 HOUR  AND total_download < 4 AND status = 3`,{ status: 0, total_download: () => 'total_download + 1' });
            const joinTableList = [{'alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on' : `company.id = custompointrequest.org_id` , 'connect' : 'custompointrequest', 'type' : 'LEFT' }];
            let getlatestRequest = await this.customPointService.requestFindOne(`custompointrequest.status = 0 AND company.status = 1 AND company.deleted = 0`, ['custompointrequest','company.id','company.company_name'],joinTableList);
            if(getlatestRequest){
                let updateInprogressStatus = await this.customPointService.requestUpdate({ id: getlatestRequest['id'] },{ status: 3 });
                this.activityLogService.create(getlatestRequest, { status: 3 }, tableConstant.CAMPAIGN.TBL_IN_CUSTOM_POINT_REQUEST, req.tokenUser?.id,'update');
                await lastValueFrom(this.cronMicroService.send({cmd: 'point_upload'}, { data: getlatestRequest }));
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'success',
                });
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND"));
            }
        } catch (error) {
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
