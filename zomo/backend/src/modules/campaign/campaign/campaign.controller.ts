import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { appConstant, campaignConstant, CampaignDto, CommonArrayService, CommonDateService, CommonService, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put, Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ActivityService } from "src/modules/activity/activity/activity.service";
import { CategoryService } from "src/modules/activity/category/category.service";
import { ScheduleChallengeService } from "src/modules/challenge/schedulechallenge/schedulechallenge.service";
import { ClientManagerAssignService } from "src/modules/company/clientmanagerassign/clientmanagerassign.service";
import { CompanyService } from "src/modules/company/companies/company.service";
import { DepartmentService } from "src/modules/company/departments/department.service";
import { LocationService } from "src/modules/company/locations/location.service";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { In, Not } from "typeorm";
import { AccessGuard, TokenGuard } from '../../../guard';
import { CampaignActivityService } from "../campaignactivity/campaignactivity.service";
import { CashRewardService } from "../cashreward/cashreward.service";
import { CampaignCategoryService } from "../category/campaigncategory.service";
import { CampaignChallengeService } from "../challenge/campaignchallenge.service";
import { PaginateWithCampaignInput } from '../input';
import { InsuranceRewardService } from "../insurancereward/insurancereward.service";
import { OtherRewardService } from "../otherreward/otherreward.service";
import { CampaignRewardService } from "../reward/campaignreward.service";
import { CampaignService } from "./campaign.service";
import { CampaignCommonInput, CreateCampaignInput, UpdateCampaignInput } from './input';
const moment = require('moment-timezone');
@Controller('incentive/campaign')
@UseGuards(TokenGuard, AccessGuard)
export class CampaignController {
    constructor(
        private readonly campaignService: CampaignService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly translatorService: TranslationService,
        private readonly departmentService: DepartmentService,
        private readonly locationService: LocationService,
        private readonly companyService: CompanyService,
        private readonly activityLogService: ActivityLogService,
        private readonly campaignActivityService: CampaignActivityService,
        private readonly campaignChallengeService: CampaignChallengeService,
        private readonly activityService: ActivityService,
        private readonly categoryService: CategoryService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly campaignRewardService: CampaignRewardService,
        private readonly campaignCategoryService: CampaignCategoryService,
        private readonly insuranceRewardService: InsuranceRewardService,
        private readonly cashRewardService: CashRewardService,
        private readonly otherRewardService: OtherRewardService,
        private readonly clientManagerAssignService: ClientManagerAssignService,
        private readonly notificationsController: NotificationsController,
    ) {}
    /*
     * Function to get paginate list of Campaigns
     * - can pass page, limit, order_by, order
     */
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCampaignInput) {
        try {
            let where = `campaign.status != 2`;
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    postData.organization_id = resultedData.map((e)=>e.org_id).join(',');
                    where += ` AND campaign.organization_id IN(${postData?.organization_id.split(',')})`;
                }else{
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
            }
            let resultedData = {};
            if (postData?.filter_by?.toLowerCase() == 'organization') {
                where += ` AND company.company_name LIKE '%${postData?.search_str}%'`;
            }
            if (postData?.filter_by?.toLowerCase() == 'campaign_name') {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'campaign.campaign_name');
            }
            resultedData = await this.campaignService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CampaignDto, resultedData['list'], req.lang)
            );
            if(resultedData['list'] && resultedData['list'].length){
                await Promise.all(resultedData['list'].map(async (ele)=>{
                    if(ele.campaign_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${ele['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                        ele.campaign_name = (customName == '' || customName == `campaign_name_${ele['id']}`) ? ele['campaign_name'] : customName;
                    }
                    if(ele.tab_titled){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_tab_titled_${ele['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${ele['organization_id']}/${ele['id']}`,`dynamic`);
                        ele.tab_titled = (customName == '' || customName == `campaign_tab_titled_${ele['id']}`) ? ele['tab_titled'] : customName;
                    }
                }));
            }
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
    /*
     * Function to get details of Campaign
     * - id and company_id is mandatory params
     */
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: CampaignCommonInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, status: Not(2) };
            if(postData?.organization_id){
                where['organization_id'] = postData?.organization_id;
            }
            let getFields = ['campaign'];
            if(postData?.getType == 'date'){
                getFields = ['campaign.id', 'campaign.start_date', 'campaign.end_date'];
            }
            let campaignDetails = await this.campaignService.findOne(where,{id: 'DESC'},getFields);
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
            campaignDetails = <any>(
                await this.commonArrayService.formatToDto(CampaignDto, campaignDetails, req.lang)
            );
            if(campaignDetails.campaign_name){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${campaignDetails['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${campaignDetails['organization_id']}`,`dynamic`);
                campaignDetails.campaign_name = (customName == '' || customName == `campaign_name_${campaignDetails['id']}`) ? campaignDetails['campaign_name'] : customName;
            }
            if(campaignDetails.tab_titled){
                let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_tab_titled_${campaignDetails['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${campaignDetails['organization_id']}`,`dynamic`);
                campaignDetails.tab_titled = (customName == '' || customName == `campaign_tab_titled_${campaignDetails['id']}`) ? campaignDetails['tab_titled'] : customName;
            }
            if(campaignDetails.department_ids){
                if(campaignDetails.department_ids !== '0'){
                    const all_departments = await this.departmentService.listRecord({                        
                        status: 1,
                        company_id: campaignDetails.organization_id,
                        id: In(campaignDetails.department_ids.split(','))
                    });
                    campaignDetails['departments'] = all_departments.map((ele)=>{
                        if(ele){
                            return {
                                id: ele['id'],
                                dept_name: ele['dept_name']
                            }
                        }
                    })
                }else{
                    campaignDetails['departments'] = [];
                }
            }
            if(campaignDetails.location_ids){
                if(campaignDetails.department_ids !== '0'){
                    const all_locations = await this.locationService.listRecord(['id', 'code', 'location_name', 'lname'],{                        
                        status: 1,
                        company_id: campaignDetails.organization_id,
                        id: In(campaignDetails.location_ids.split(','))
                    });
                    campaignDetails['locations'] = all_locations.map((ele)=>{
                        if(ele){
                            return {
                                id: ele['id'],
                                location_name: ele['location_name'],
                                lname: ele['lname']
                            }
                        }
                    })
                }else{
                    campaignDetails['locations'] = [];
                }
            }
            if(campaignDetails.organization_id){
                if(campaignDetails.organization_id !== 0){
                    const companyData = await this.companyService.companyFindOne({id: campaignDetails.organization_id}, ['id', 'company_name']);
                    campaignDetails['company'] = companyData;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: campaignDetails,
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
    /*
     * Function to get list of Campaigns
     * - can pass search_str, order_by, order, company_id
     */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCampaignInput){
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where= `campaign.status != 2 `;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'campaign.campaign_name');
            }
            if (appConstant.ROLE.CLIENTENGAGEMENTMANAGER == req.tokenUser?.role_id){
                let resultedData = await this.clientManagerAssignService.listRecord({user_id: req.tokenUser?.id,status: 1},null);
                if(resultedData.length > 0){
                    postData.company_id = resultedData.map((e)=>e.org_id).join(',');
                }
                else{
                    return res.status(HttpStatus.OK).json({
                        statusCode: 200,
                        success: 1,
                        error: 0,
                        data: [],
                        message: 'success',
                    });
                }
            }
            if (postData?.company_id) {
                where += ` AND campaign.organization_id In(${postData?.company_id.toString().split(',')}) `;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            if(postData.pointsleaderboardpopup){
                let date = moment().format('YYYY-MM-DD');
                where = where.replace('campaign.status != 2 ','campaign.status = 1 ')
                where += ` AND('${date}' >= campaign.d_start_date AND '${date}' <= campaign.d_end_date)`;
            }
            let result = await this.campaignService.listRecord(where, { [orderBy]: order });
            result = <any>(
                await this.commonArrayService.formatToDto(CampaignDto, result, req.lang)
            );
            if(result && result.length){
                await Promise.all(result.map(async (ele)=>{
                    if(ele.campaign_name){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_name_${ele['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${ele['organization_id']}`,`dynamic`);
                        ele.campaign_name = (customName == '' || customName == `campaign_name_${ele['id']}`) ? ele['campaign_name'] : customName;
                    }
                    if(ele.tab_titled){
                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`campaign_tab_titled_${ele['id']}`, `/LC_MESSAGES/Campaign/Campaigns/${ele['organization_id']}`,`dynamic`);
                        ele.tab_titled = (customName == '' || customName == `campaign_tab_titled_${ele['id']}`) ? ele['tab_titled'] : customName;
                    }
                    delete(ele['start_date_copy']);
                    delete(ele['end_date_copy']);
                }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
    /*
     * Use to create new campaign
     * - organization_id, campaign_name, start_date, end_date, status is mandatory params
     */
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCampaignInput) {
        try {
            if (
                !postData?.organization_id ||
                !postData?.campaign_name ||
                !postData?.start_date ||
                !postData?.end_date 
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const campaignPlanCheck = await this.campaignService.findOne({
                campaign_name: postData?.campaign_name, organization_id: postData?.organization_id, status: Not(2)
            });
            if (campaignPlanCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_EXIST"));
            }
            if(postData?.department_ids == 'all'){
                postData.department_ids = '0';
            }
            if(postData?.location_ids == 'all'){
                postData.location_ids = '0';
            }
            const insertRecord = await this.campaignService.save(postData);
            let campaign_id = null;
            if(Object.keys(postData).length > 0){
                campaign_id = insertRecord['id'];
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_SOMETHING_WENT_WRONG'));
            }
            let dynamicDatas = Object.create(null);
            if(postData?.campaign_name){
                let tilte = `campaign_name_${insertRecord['id']}`
                dynamicDatas[`${tilte}`]= postData?.campaign_name;
            }            
            if(postData?.tab_titled){
                let tilte = `campaign_tab_titled_${insertRecord['id']}`
                dynamicDatas[`${tilte}`]= postData?.tab_titled;
            }            
            await this.translatorService.DynamicEngJsonData('Campaign',postData?.organization_id,dynamicDatas,'Edit','Campaigns',insertRecord['id']);
            this.addNotification({
                id: insertRecord?.['id'], 
                org_id: insertRecord?.['organization_id'], 
                user_id: 0, 
                custom_cname: insertRecord?.['campaign_name'], 
                campaign_id: insertRecord?.['id'],  
                logo:  null, 
                type: 'add',
                url: `https://${process.env.DOMAIN}/incentive-summary`,
                start_date: postData?.start_date,
                end_date: postData?.end_date
            }, req);
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {campaign_id : campaign_id, org_id: postData?.organization_id},
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
    /*
     * Use to update campaign
     * - id and organization_id is mandatory params
     */
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCampaignInput) {
        try {
            if (!postData?.id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            for (const key in postData) {
                if (postData[key] === '') {
                    delete postData[key];
                }
            }
            const campId = postData?.id;
            const orgId = postData?.organization_id;
            const where = { id: postData?.id, status: Not(2) };
            const recordDetails = await this.campaignService.findOne(where);
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
            if (postData?.campaign_name) {
                const campaignPlanCheck = await this.campaignService.findOne({
                    id: Not(postData?.id), campaign_name: postData?.campaign_name, organization_id: postData?.organization_id, status: Not(2)
                });
                if (campaignPlanCheck) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_EXIST"));
                }
            }
            if(postData?.department_ids == 'all'){
                postData.department_ids = '0';
            }
            if(postData?.location_ids == 'all'){
                postData.location_ids = '0';
            }
            postData.status = 1; 
            await this.campaignService.update(
              { id: postData?.id },
              {
                ...postData,
              },
            );
            this.activityLogService.create(recordDetails, postData, tableConstant.CAMPAIGN.TBL_CAMPAIGN, req.tokenUser?.id);
            let dynamicDatas = Object.create(null);
            if(postData?.campaign_name){
                let tilte = `campaign_name_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.campaign_name;
            }            
            if(postData?.tab_titled){
                let tilte = `campaign_tab_titled_${recordDetails['id']}`
                dynamicDatas[`${tilte}`]= postData?.tab_titled;
            }            
            await this.translatorService.DynamicEngJsonData('Campaign',recordDetails.organization_id,dynamicDatas,'Edit','Campaigns',recordDetails['id']);
            if(postData?.start_date || postData?.end_date){
                let notificationData = {
                    custom_cname: recordDetails?.['campaign_name'],  
                    campaign_id: recordDetails['id'], 
                    org_id: recordDetails?.organization_id, 
                    id: recordDetails?.id,
                    type: 'update',
                    url: `https://${process.env.DOMAIN}/incentive-summary`,
                    logo: null
                };
                if(postData?.start_date){
                    notificationData['start_date'] = postData?.start_date;
                }
                if(postData?.end_date){
                    notificationData['end_date'] = postData?.end_date;                    
                }
                this.addNotification(notificationData, req);
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { campaign_id : campId, org_id: orgId },
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
    /*
     * Use to delete an Campaign
     * - id and organization_id is mandatory params
     */
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: CampaignCommonInput) {
        try {
            if (!postData?.campaign_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.campaign_id, status: Not(2) };
            let campaignDetails = await this.campaignService.findOne(where);
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
            let getRewardIds = await this.campaignRewardService.listofIds({campaign_id: postData?.campaign_id, status: Not(2)});
            /* Delete Campaign */
            await this.campaignService.update({ id: postData?.campaign_id },{ status: 2 });
            this.activityLogService.create({id: postData?.campaign_id, status: 1}, {status: 2}, tableConstant.CAMPAIGN.TBL_CAMPAIGN, req.tokenUser?.id, 'delete campaign');
             /* Delete Reward */
            await this.campaignRewardService.update({ campaign_id: postData?.campaign_id },{ status: 2 });
            const campaignRewards = await this.campaignRewardService.listRecord({campaign_id: postData?.campaign_id, status: Not(2)});
            campaignRewards?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_CAMPAIGN_ACTIVITY, req.tokenUser?.id, 'delete campaign reward'));
            /* Delete Activity */
            await this.campaignActivityService.update({ campaign_id: postData?.campaign_id, reward_id: In(getRewardIds)},{ status: 2 });
            const campaignActivitys = await this.campaignActivityService.loglistRecord({campaign_id: postData?.campaign_id, reward_id: In(getRewardIds), status: Not(2)});
            campaignActivitys?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_CAMPAIGN_ACTIVITY, req.tokenUser?.id, 'delete campaign activitys'));
            /* Delete Campagin Challenge */
            await this.campaignChallengeService.update({ campaign_id: postData?.campaign_id , reward_id: In(getRewardIds)},{ status: 2 });
            const campaignChallenges = await this.campaignChallengeService.listRecord({campaign_id: postData?.campaign_id, reward_id: In(getRewardIds), status: Not(2)});
            campaignChallenges?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete campaign challenge'));
            /* Delete Campagin Categorys */
            await this.campaignCategoryService.update({ campaign_id: postData?.campaign_id , reward_id: In(getRewardIds)},{ status: 2 });
            const campaignCategory = await this.campaignCategoryService.loglistRecord({campaign_id: postData?.campaign_id, reward_id: In(getRewardIds), status: Not(2)});
            campaignCategory?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete campaign category'));
             /* Delete Insurance Reward */
             await this.insuranceRewardService.update({ reward_id: In(getRewardIds)},{ status: 2 });
             const insuranceReward = await this.insuranceRewardService.listRecord({reward_id: In(getRewardIds), status: Not(2)});
             insuranceReward?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete campaign insurance reward'));
              /* Delete Cash Reward */
            await this.cashRewardService.update({ reward_id: In(getRewardIds)},{ status: 2 });
            const CashReward = await this.cashRewardService.listRecord({reward_id: In(getRewardIds), status: Not(2)});
            CashReward?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete campaign cash reward'));
             /* Delete Other Reward */
             await this.otherRewardService.update({ reward_id: In(getRewardIds)},{ status: 2 });
             const otherReward = await this.otherRewardService.listRecord({reward_id: In(getRewardIds), status: Not(2)});
             otherReward?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete campaign other reward'));
            this.notificationsController.removeNotification({org_id: campaignDetails?.organization_id, campaign_id: postData?.campaign_id},req);
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
    /*
     * Use to copy an Campaign
     * - id and copy_type and org_id is mandatory params
     */
    @Put('copy')
    async copy(@Req() req: Request, @Res() res: Response, @Body() postData: CampaignCommonInput) {
        try {
            let returnResponce;
            if (!postData?.id || !postData?.copy_type) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if(postData?.copy_type == 2 && !postData?.org_id){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            const campaign = await this.campaignService.findOne({id: postData?.id, status : Not(2)});
            let newCampaignId = 0;
            let camOrgId = 0;
            if (campaign) {
                const campaignData = JSON.parse(JSON.stringify(campaign));
                if(postData?.copy_type == 2){
                    camOrgId = postData?.org_id;
                }else{
                    camOrgId = campaignData.organization_id;
                }
                delete campaign.id;
                campaign['campaign_name'] = 'Copy - ' + campaign.campaign_name;
                campaign['status'] = 0;
                campaign['is_copy'] = 1;
                if(postData?.copy_type == 2){
                    campaign['location_ids'] = "0";
                    campaign['department_ids'] = "0";
                    campaign['organization_id'] = camOrgId;
                }
                const copiedDatas = await this.campaignService.save({...campaign});
                if(copiedDatas){
                    newCampaignId = copiedDatas['id'];
                    /* 
                        //need to add notification here if required 
                        // if(postData?.copy_type == 2 && (campaign?.start_date || campaign?.end_date)){
                        //     let notificationData = {
                        //         custom_cname: campaign?.['campaign_name'],  
                        //         campaign_id: newCampaignId, 
                        //         org_id: campaign?.organization_id, 
                        //         id: newCampaignId,
                        //         type: 'update',
                        //         url: `https://${process.env.DOMAIN}/incentive-summary`,
                        //         logo: null
                        //     };
                        //     if(campaign?.start_date){
                        //         notificationData['start_date'] = campaign?.start_date;
                        //     }
                        //     if(campaign?.end_date){
                        //         notificationData['end_date'] = campaign?.end_date;                    
                        //     }
                        //     this.addNotification(notificationData, req);
                        // }
                    */
                    let getRewardIds = await this.campaignRewardService.listofIds({ campaign_id: postData?.id, status: Not(2) });
                    let rewardDatas = [];
                    if(getRewardIds?.length > 0){
                        for(let i = 0; i < getRewardIds?.length; i++){
                            const reward_id = getRewardIds[i];
                            const where = { id: reward_id, campaign_id: postData?.id, status: Not(2) };
                            let rewardDetails = await this.campaignRewardService.getOne(where,['campaignreward','insurance','cash','other'],'full');
                            if (rewardDetails) {
                                delete rewardDetails.id;
                                let newRewardData = Object.assign({}, rewardDetails);
                                const oldInsuranceData = newRewardData['insurance'];
                                const oldCashData = newRewardData['cash'];
                                const oldOtherData = newRewardData['other'];
                                delete newRewardData['insurance'];
                                delete newRewardData['cash'];
                                delete newRewardData['other'];
                                newRewardData['campaign_id'] = newCampaignId;
                                newRewardData['ins_reward'] = 0;
                                newRewardData['ins_ids'] = "0";
                                newRewardData['cash_reward'] = 0;
                                newRewardData['cash_ids'] = "0";
                                newRewardData['other_reward'] = 0;
                                newRewardData['other_ids'] = "0";
                                newRewardData['related_activity'] = "";
                                newRewardData['related_challenge'] = "";
                                newRewardData['related_category'] = "";
                                const copiedRewardDatas = await this.campaignRewardService.save({...newRewardData});
                                if(copiedRewardDatas){
                                    const newRewardId = copiedRewardDatas['id'];
                                    /* SUB REWARD DATA COPY */
                                        let insertedInsuranceIds = [];
                                        let updateRewardData:any = Object.create(null);
                                        if(postData?.copy_type == 1){
                                            if(rewardDetails['ins_reward'] == 1){
                                                let newInsuranceRewardData = Object.assign({}, oldInsuranceData);
                                                for (const key in newInsuranceRewardData) {
                                                    delete newInsuranceRewardData[key].id;
                                                    newInsuranceRewardData[key]['reward_id'] = newRewardId;
                                                }
                                                if(Object.keys(newInsuranceRewardData)?.length > 0){
                                                    newInsuranceRewardData = Object.values(newInsuranceRewardData);
                                                    let insertedInsuranceDatas = await this.insuranceRewardService.save(newInsuranceRewardData);
                                                    insertedInsuranceIds = insertedInsuranceDatas.identifiers.map((item) => item.id);
                                                }
                                            }
                                        }
                                        let insertedCashIds = [];
                                        if(rewardDetails['cash_reward'] == 1){
                                            let newCashRewardData = Object.assign({}, oldCashData);
                                            for (const keyC in newCashRewardData) {
                                                delete newCashRewardData[keyC].id;
                                                newCashRewardData[keyC]['reward_id'] = newRewardId;
                                            }
                                            if(Object.keys(newCashRewardData)?.length > 0){
                                                newCashRewardData = Object.values(newCashRewardData);
                                                let insertedCashRewardDatas = await this.cashRewardService.save(newCashRewardData);
                                                insertedCashIds = insertedCashRewardDatas.identifiers.map((item) => item.id);
                                            }
                                        }
                                        let insertedOtherIds = [];
                                        if(rewardDetails['other_reward'] == 1){
                                            let newOtherRewardData = Object.assign({}, oldOtherData);
                                            for (const keyO in newOtherRewardData) {
                                                delete newOtherRewardData[keyO].id;
                                                newOtherRewardData[keyO]['reward_id'] = newRewardId;
                                            }
                                            if(Object.keys(newOtherRewardData)?.length > 0){
                                                newOtherRewardData = Object.values(newOtherRewardData);
                                                let insertedOtherRewardDatas = await this.otherRewardService.save(newOtherRewardData);
                                                insertedOtherIds = insertedOtherRewardDatas.identifiers.map((item) => item.id);
                                            }
                                        }
                                        if(insertedInsuranceIds?.length > 0){
                                            updateRewardData['ins_ids'] = insertedInsuranceIds.join(',');
                                            updateRewardData['ins_reward'] = 1;
                                        }
                                        if(insertedCashIds?.length > 0){
                                            updateRewardData['cash_ids'] = insertedCashIds.join(',');
                                            updateRewardData['cash_reward'] = 1;
                                        }
                                        if(insertedOtherIds?.length > 0){
                                            updateRewardData['other_ids'] = insertedOtherIds.join(',');
                                            updateRewardData['other_reward'] = 1;
                                        }
                                    /* SUB REWARD DATA COPY */
                                    /* ACTIVITY & CHALLENGE AND CATEGORY DATA COPY */
                                        let activityConditions = `campaignactivity.campaign_id = ${postData?.id} AND campaignactivity.reward_id = ${reward_id} AND campaignactivity.status != 2`;
                                        if(postData?.copy_type == 2){
                                            activityConditions = `campaignactivity.campaign_id = ${postData?.id} AND campaignactivity.reward_id = ${reward_id} AND campaignactivity.status != 2 AND activity.accebility = 0`;
                                        }
                                        let getAllActivities = await this.campaignActivityService.listRecord(
                                            activityConditions,
                                            { order_id: 'ASC' },
                                            ['campaignactivity', 'activity.id', 'activity.activity_name',  'activity.accebility', 'category.id', 'category.category_name', 'category.qty_req', 'category.reqby_usr', 'category.reqby_spouse', 'category.max_freto_earn_point', 'category.point_for_each', 'category.max_point_per_cham']
                                        );
                                        let insertedActivityIds = [];
                                        if(Object.keys(getAllActivities).length > 0){
                                            let newActivityData = Object.assign({}, getAllActivities);
                                            for (const key in newActivityData) {
                                                delete newActivityData[key].id;
                                                newActivityData[key]['reward_id'] = newRewardId;
                                                newActivityData[key]['campaign_id'] = newCampaignId;
                                                delete newActivityData[key]['activity'];
                                                delete newActivityData[key]['category'];
                                            }
                                            if(Object.keys(newActivityData)?.length > 0){
                                                newActivityData = Object.values(newActivityData);
                                                let insertedActivityDatas = await this.campaignActivityService.save(newActivityData);
                                                insertedActivityIds = insertedActivityDatas.identifiers.map((item) => item.id);
                                            }
                                        }
                                        let insertedChallengeIds = [];
                                        if(postData?.copy_type == 1){
                                            let getAllChallenges = await this.campaignChallengeService.listRecord(
                                                `campaignchallenge.campaign_id = ${postData?.id} AND campaignchallenge.reward_id = ${reward_id} AND campaignchallenge.status != 2 AND sc.org_id = ${camOrgId}`,
                                                { order_id: 'ASC' },
                                                ['campaignchallenge','sc.id','sc.custom_cname','ch.id','ch.challenge_name'],
                                                'yes'
                                            );
                                            if(Object.keys(getAllChallenges).length > 0){
                                                let newChallengeData = Object.assign({}, getAllChallenges);
                                                for (const key in newChallengeData) {
                                                    delete newChallengeData[key].id;
                                                    newChallengeData[key]['reward_id'] = newRewardId;
                                                    newChallengeData[key]['campaign_id'] = newCampaignId;
                                                    delete newChallengeData[key]['sc'];
                                                    delete newChallengeData[key]['ch'];
                                                }
                                                if(Object.keys(newChallengeData)?.length > 0){
                                                    newChallengeData = Object.values(newChallengeData);
                                                    let insertedChallengeDatas = await this.campaignChallengeService.save(newChallengeData);
                                                    insertedChallengeIds = insertedChallengeDatas.identifiers.map((item) => item.id);
                                                }
                                            }
                                        }  
                                        let getAllCategory = await this.campaignCategoryService.listRecord(
                                            `campaigncategory.campaign_id = ${postData?.id} AND campaigncategory.reward_id = ${reward_id} AND campaigncategory.status != 2`,
                                            { order_id: 'ASC' },
                                            ['campaigncategory', 'category.id', 'category.category_name', 'category.qty_req', 'category.reqby_usr', 'category.reqby_spouse', 'category.max_freto_earn_point', 'category.point_for_each', 'category.max_point_per_cham'],
                                            'yes'
                                        );
                                        let insertedCategoryIds = [];
                                        if(Object.keys(getAllCategory).length > 0){
                                            let newCategoryData = Object.assign({}, getAllCategory);
                                            for (const key in newCategoryData) {
                                                delete newCategoryData[key].id;
                                                newCategoryData[key]['reward_id'] = newRewardId;
                                                newCategoryData[key]['campaign_id'] = newCampaignId;
                                                delete newCategoryData[key]['category'];
                                            }
                                            if(Object.keys(newCategoryData)?.length > 0){
                                                newCategoryData = Object.values(newCategoryData);
                                                let insertedCategoryDatas = await this.campaignCategoryService.save(newCategoryData);
                                                insertedCategoryIds = insertedCategoryDatas.identifiers.map((item) => item.id);
                                            }
                                        }
                                        if(insertedActivityIds?.length > 0){
                                            updateRewardData['related_activity'] = insertedActivityIds.join(',');
                                        }else{
                                            updateRewardData['related_activity'] = '';
                                        }
                                        if(insertedChallengeIds?.length > 0){
                                            updateRewardData['related_challenge'] = insertedChallengeIds.join(',');
                                        }else{
                                            updateRewardData['related_challenge'] = '';
                                        }
                                        if(insertedCategoryIds?.length > 0){
                                            updateRewardData['related_category'] = insertedCategoryIds.join(',');
                                        }else{
                                            updateRewardData['related_category'] = '';
                                        }
                                        await this.campaignRewardService.update(
                                            { id: newRewardId, campaign_id: newCampaignId },
                                            {
                                                ...updateRewardData,
                                            },
                                        );
                                    /* ACTIVITY & CHALLENGE AND CATEGORY DATA COPY */
                                }
                            }   
                        }
                    }
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_SOMETHING_WENT_WRONG'));
                }
                this.activityLogService.create(campaignData, copiedDatas, tableConstant.CAMPAIGN.TBL_CAMPAIGN, req.tokenUser?.id,'copy');
            } else {
                throw new Error((await this.translatorService.frontendReadTranslation(req.lang,'ERR_COPY_FIELD')).replace('%s', 'Campaign'));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: {campaign_id : newCampaignId, org_id: camOrgId},
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
    /*
     * Use to get activity info
     * - campaign_id and type and organization_id and seleted_id is mandatory params
     */
    @Post('get-add-activity-info')
    async getAddActivityInfo(@Req() req: Request, @Res() res: Response, @Body() postData: CampaignCommonInput) {
        try {
            if (!postData?.campaign_id || !postData?.type || !postData?.organization_id || !postData?.seleted_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const campaignPlanCheck = await this.campaignService.findOne({
                id: postData?.campaign_id, status: Not(2), organization_id: postData?.organization_id
            });
            if (!campaignPlanCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            let result = null;
            if(postData?.type == 'activity'){
                result = await this.activityService.findOne({id: postData?.seleted_id}, null , ['activity', 'category']);
                if(result.activity_name){
                    let customName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${result['id']}`, `/LC_MESSAGES/Campaign/Category/${result['id']}`,`dynamic`);
                    result.activity_name = (customName == '' || customName == `activity_name_${result['id']}`) ? result['activity_name'] : customName;
                }
            }else if(postData?.type == 'category'){
                result = await this.categoryService.findOne({id: postData?.seleted_id});
            }else if(postData?.type == 'challenge'){
                result = await this.scheduleChallengeService.challengeFindOne(['sc','challenge'],{id: postData?.seleted_id, status: Not(2), org_id: postData?.organization_id});
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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
    /*
     * Use to get org all campagin activity list
     * - org_id is mandatory params
     */
    @Post('get-org-campaign-activity-list')
    async getOrgCampaignActivityList(@Req() req: Request, @Res() res: Response, @Body() postData: CampaignCommonInput) {
        try {
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            if (req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN || req.tokenUser?.role_id == appConstant.ROLE.ADMIN) {
                if(req.tokenUser?.role_id == appConstant.ROLE.ORGADMIN && postData?.company_id != req.tokenUser?.org_id){
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_FORBIDDEN_ACCESS"));
                }
            }
            let currentDate = await this.commonDateService.DateTimeFormat('now', 'YYYY-MM-DD', '', 'UTC');
            currentDate = currentDate + ' 00:00:00';
            const where = `campaign.d_start_date <= '${currentDate}' AND campaign.d_end_date >= '${currentDate}' AND campaign.status != 2 AND campaign.organization_id = ${postData?.company_id}`;
            const campaignList = await this.campaignService.listRecord(where);
            const idList = campaignList.map(campaign => campaign.id);
            let activityLists = [];
            if(idList.length > 0){
                let whereA = `campaignactivity.campaign_id IN (${idList.join(',')}) AND campaignactivity.status = 1`;
                const campaignActivityList = await this.campaignActivityService.listRecord(whereA, { campaign_id: 'ASC' }, ['campaignactivity.id', 'campaignactivity.campaign_id', 'campaignactivity.reward_id', 'campaignactivity.cust_name',  'activity.activity_name', 'category.category_name'], 'yes');
                for (let cRwo of campaignList) {
                    for (let cRow of campaignActivityList) {
                        if (cRow.campaign_id == cRwo.id) {
                            let activityData = Object.create(null);
                            let actName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${cRwo.id}_${cRow.reward_id}_${cRow.id}`, `/LC_MESSAGES/Campaign/Campaigns/${postData?.company_id}/${cRwo.id}`,`dynamic`);
                            if(cRow?.cust_name){
                                actName = (actName == '' || actName == `activity_name_${cRwo.id}_${cRow.reward_id}_${cRow.id}`) ? cRow['cust_name'] : actName;
                            }else{
                                actName = (actName == '' || actName == `activity_name_${cRwo.id}_${cRow.reward_id}_${cRow.id}`) ? cRow?.['activity']?.['activity_name'] : actName;
                            }
                            activityData['id'] = cRow.id;
                            activityData['activity_name'] = actName;
                            activityData['campaign_name'] = cRwo.campaign_name;
                            activityLists.push(activityData);
                        }
                    }
                }
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND"));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: activityLists,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    /*
     * Function to get list of Org Admin Tab Setting Option List
     */
    @Post('tab-setting-list')
    async tabSettingList(@Req() req: Request, @Res() res: Response, @Body() postData: CampaignCommonInput){
        try {
            let result = campaignConstant.CAMPAIGN_TAB_SETTING;
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
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

    async addNotification(campaignData: any, req: Request) {
        try {
            if(campaignData?.type == 'add' || campaignData?.type == 'update'){
                if(campaignData?.type == 'update'){
                    let whereCondition = { org_id: campaignData?.org_id };
                    if(campaignData?.campaign_id || campaignData?.campaign_id == 0){ 
                        whereCondition['campaign_id'] = campaignData?.campaign_id;
                    }
                    await this.notificationsController.removeNotification(whereCondition,req);
                }
                let message = `${campaignData?.custom_cname} Campaign`;
                let notificationData = {
                    org_id: campaignData.org_id,
                    user_id: 0,
                    title: campaignData?.title ?? "Upcoming Campaign",
                    message: `${campaignData?.custom_cname} Campaign`,
                    type: 1,
                    module_name: 'Campaign',
                    submodule_name: 'Campaign',
                    metadata: {
                        campaign_id: campaignData?.campaign_id,
                        id: campaignData?.id,
                        logo: campaignData?.logo,
                        url: campaignData?.url,
                        notification_date: null,
                        notification_sent: 0,
                        notification_sent_count: 0,
                    },
                };
                if(campaignData?.start_date || campaignData?.end_date){ 
                    if(campaignData?.start_date?.includes('/')){
                        campaignData.start_date = await this.commonDateService.getTodayDate(campaignData?.start_date, 'MM/DD/YYYY')
                    }
                    if(campaignData?.end_date?.includes('/')){
                        campaignData.end_date = await this.commonDateService.getTodayDate(campaignData?.end_date, 'MM/DD/YYYY')
                    }
                    let startDate = this.commonDateService.getTodayDate(campaignData?.start_date).format('YYYY-MM-DD');
                    notificationData['metadata']['notification_date'] = startDate;
                    notificationData['metadata']['start_date'] = startDate;
                    notificationData['metadata']['notification_sent'] = 0;
                    notificationData['message'] = message + ' starts Today';
                    await this.notificationsController.sendNotification(0, notificationData, req);
                    
                    if(campaignData?.end_date){
                        notificationData['title'] = 'Campaign Expiration';
                        let endDate = this.commonDateService.getTodayDate(campaignData?.end_date).format('YYYY-MM-DD');
                        notificationData['metadata']['notification_date'] = endDate;
                        notificationData['metadata']['notification_sent'] = endDate;
                        notificationData['metadata']['notification_sent'] = 1;
                        notificationData['metadata']['end_date'] = endDate;
                        notificationData['message'] = message + ' ends Today';
                        await this.notificationsController.sendNotification(0, notificationData, req);
                    }
                }   
            }
            return;
        }
        catch (error) {
            await this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            return
        }
    }
}
