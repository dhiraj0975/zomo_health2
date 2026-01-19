import { appConstant, CampaignActivityDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { In, Not } from "typeorm";
import { AccessGuard, TokenGuard } from '../../../guard';
import { PaginateWithCompanyInput } from "../../../input";
import { CampaignService } from "../campaign/campaign.service";
import { CampaignCategoryService } from "../category/campaigncategory.service";
import { CampaignChallengeService } from "../challenge/campaignchallenge.service";
import { CampaignRewardService } from "../reward/campaignreward.service";
import { CampaignActivityService } from "./campaignactivity.service";
import { CreateCampaignActivityInput, UpdateCampaignActivityInput } from './input';
@Controller('incentive/campaign-activity')
@UseGuards(TokenGuard, AccessGuard)
export class CampaignActivityController {
    constructor(
        private readonly campaignActivityService: CampaignActivityService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly campaignService: CampaignService,
        private readonly campaignRewardService: CampaignRewardService,
        private readonly activityService: ActivityService,
        private readonly categoryService: CategoryService,
        private readonly scheduleChallengeService: ScheduleChallengeService,
        private readonly campaignChallengeService: CampaignChallengeService,
        private readonly campaignCategoryService: CampaignCategoryService
    ) {}
    /*
     * Function to get paginate list of Campaign Activities
     * - can pass page, limit, order_by, order
     * - campaign_id is mandatory params
     */
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCompanyInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (!postData?.campaign_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            let where = `campaignactivity.status != 2 AND campaignactivity.campaign_id = '${postData?.campaign_id}'`;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'campaignactivity.cust_name');
            }
            const resultedData = await this.campaignActivityService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CampaignActivityDto, resultedData['list'], req.lang)
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
    /*
     * Function to get details of Campaign Activity
     * - id and company_id is mandatory params
     */
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, organization_id: postData?.company_id, status: Not(2) };
            let campaignDetails = await this.campaignActivityService.findOne(where);
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
                await this.commonArrayService.formatToDto(CampaignActivityDto, campaignDetails, req.lang)
            );
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
     * Function to get list of Campaign Activities
     * - can pass search_str, order_by, order, company_id
     */
    @Post('list')
    async list(@Req() req:any, @Res() res: Response, @Body() postData: any){
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `campaignactivity.status != 2 `;
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,'campaignactivity.cust_name');
            }
            if (postData?.campaign_id) {
                where +=  ` AND campaignactivity.campaign_id IN(${postData?.campaign_id.split(',')}) `;
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.campaignActivityService.listRecord(where, { [orderBy]: order },['campaignactivity.id','campaignactivity.campaign_id','campaignactivity.activity_id','activity.id','activity.activity_name','campaignactivity.cust_name']);
            result = result.map((item: any) => {
                if (item.cust_name && item.cust_name.trim() !== '' && item.activity) {
                    item.activity.activity_name = item.cust_name;
                }
                return item;
            });
            result = <any>(
                await this.commonArrayService.formatToDto(CampaignActivityDto, result, req.lang)
            );
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
     * Use to create new campaign activity
     * - organization_id, campaign_name, start_date, end_date, status is mandatory params
     */
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: CreateCampaignActivityInput) {
        try {
            if ((req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id)  && (!postData?.campaign_id || !postData?.reward_id || !postData?.activityData || !postData?.organization_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const checkCampaign = await this.campaignService.findOne({
                id: postData?.campaign_id, status: Not(2), organization_id: postData?.organization_id
            });
            if (!checkCampaign) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            const checkReward = await this.campaignRewardService.checkReward({
                id: postData?.reward_id, campaign_id: postData?.campaign_id, status: Not(2)
            });
            if (!checkReward) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REWARD_RECORD_NOT_FOUND"));
            }
            let activitiesData = JSON.parse(postData?.activityData);
            if(Object.keys(activitiesData)?.length > 0){
                let updateRewardData:any = Object.create(null);
                const transformToKeyValue = (array: any[],type:any) => {
                    let tempData = Object.create(null);
                    let tempDataIds = [];
                    array.map(datas => {
                        if(type == 'activitys'){
                            if(datas?.isDefine == 1){
                                tempData[Number(datas.activity_id)] = datas;
                                tempDataIds.push(Number(datas.activity_id));
                            }
                        }else if(type == 'challenges'){
                            if(datas?.isDefine == 2){
                                tempData[Number(datas.challenge_schedule_id)] = datas;
                                tempDataIds.push(Number(datas.challenge_schedule_id));
                            }
                        }else if(type == 'categorys'){
                            if(datas?.isDefine == 3){
                                tempData[Number(datas.category_id)] = datas;
                                tempDataIds.push(Number(datas.category_id));
                            }
                        }
                    });
                    let tempInfo = Object.create(null);
                    if (Object.keys(tempData)?.length > 0) {
                        tempInfo = tempData;
                        tempData = Object.create(null);
                    }
                    let tempIds = Object.create(null);
                    if (tempDataIds?.length > 0) {
                        tempIds = tempDataIds;
                        tempDataIds = [];
                    }
                    return {'tempInfo' : tempInfo, 'tempIds' : tempIds};
                };
                const activitiesDatas = {
                    activitys: transformToKeyValue(activitiesData,'activitys'),
                    challenges: transformToKeyValue(activitiesData,'challenges'),
                    categorys: transformToKeyValue(activitiesData,'categorys'),
                };
                let activitysList = activitiesDatas?.activitys?.tempInfo ? activitiesDatas?.activitys?.tempInfo : {};
                let challengesList = activitiesDatas?.challenges?.tempInfo ? activitiesDatas?.challenges?.tempInfo : {};
                let catogorysList = activitiesDatas?.categorys?.tempInfo ? activitiesDatas?.categorys?.tempInfo : {};
                let getActivityDatas = [];
                if(activitiesDatas?.activitys?.tempIds && activitiesDatas?.activitys?.tempIds?.length > 0){
                    getActivityDatas = await this.activityService.campaignActivityRecord({id: In(activitiesDatas?.activitys?.tempIds), status: 1}, ['activity', 'category'], {'category.id' : 'ASC'});
                    if(getActivityDatas && getActivityDatas.length){
                        await Promise.all(getActivityDatas.map(async (ele)=>{
                            if(ele.activity_name){
                                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`activity_name_${ele['id']}`, `/LC_MESSAGES/ActivityForms/Activities/${ele['id']}`,`dynamic`);
                                ele.activity_name = (customeName == '' || customeName == `activity_name_${ele['id']}`) ? ele['activity_name'] : customeName;
                            }
                            if(ele.category && ele.category.category_name){
                                let customeName = await this.translatorService.frontendReadTranslation(req.lang,`category_name_${ele.category['id']}`, `/LC_MESSAGES/Campaign/Category/${ele.category['id']}`,`dynamic`);
                                ele.category.category_name = (customeName == '' || customeName == `category_name_${ele.category['id']}`) ? ele.category['category_name'] : customeName;
                            }
                        }));
                    }
                }
                let getCategoryDatas = [];
                if(activitiesDatas?.categorys?.tempIds && activitiesDatas?.categorys?.tempIds?.length > 0){
                    getCategoryDatas = await this.categoryService.listRecord(null, {id: In(activitiesDatas?.categorys?.tempIds), status: 1});
                }
                let getChallengeDatas = [];
                if(activitiesDatas?.challenges?.tempIds && activitiesDatas?.challenges?.tempIds?.length > 0){
                    getChallengeDatas = await this.scheduleChallengeService.listRecord({id: In(activitiesDatas?.challenges?.tempIds), status: 1}, { id: 'DESC' }, ['sc', 'ch']);
                }
                let insertedActivitysIds = [];
                if(Object.keys(activitysList)?.length > 0 && getActivityDatas?.length > 0 && Object.keys(activitysList)?.length == getActivityDatas?.length){
                    let insertActivityData = Object.create(null);
                    for (const key in activitysList) {
                        let singleActivityData = getActivityDatas.find((data: any) => data.id == key);
                        if(singleActivityData){
                            insertActivityData[key] = {
                                campaign_id: postData?.campaign_id,
                                reward_id: postData?.reward_id,
                                activity_id: singleActivityData?.id,
                                cust_name: activitysList[key]?.cust_name ? activitysList[key]?.cust_name : "",
                                cust_description: activitysList[key]?.cust_description ? activitysList[key]?.cust_description : "",
                                quentity: activitysList[key]?.quentity ? activitysList[key]?.quentity : "",
                                required_by_user: activitysList[key]?.required_by_user ? activitysList[key]?.required_by_user : "",
                                required_by_spouse: activitysList[key]?.required_by_spouse ? activitysList[key]?.required_by_spouse : "",
                                frequincy: activitysList[key]?.frequincy ? activitysList[key]?.frequincy : "",
                                frequincy_max_point: activitysList[key]?.frequincy_max_point ? activitysList[key]?.frequincy_max_point : "",
                                point_for_each: activitysList[key]?.point_for_each ? activitysList[key]?.point_for_each : "",
                                max_point: activitysList[key]?.max_point ? activitysList[key]?.max_point : "",
                                ac_max: activitysList[key]?.ac_max ? activitysList[key]?.ac_max : "",
                                ac_min: activitysList[key]?.ac_min ? activitysList[key]?.ac_min : "",
                                per_change: activitysList[key]?.per_change ? activitysList[key]?.per_change : "",
                                alt_activity: activitysList[key]?.alt_activity ? activitysList[key]?.alt_activity : null,
                                start_date: (activitysList[key]?.start_date && activitysList[key]?.start_date != '') ? `${activitysList[key]?.start_date} 00:00:00`  : '',
                                end_date: (activitysList[key]?.end_date && activitysList[key]?.end_date != '') ?  `${activitysList[key]?.end_date} 00:00:00` : '',
                                point_end_date: (activitysList[key]?.point_end_date && activitysList[key]?.point_end_date != '') ?  `${activitysList[key]?.point_end_date} 00:00:00` : null,
                                after_deadline_date: (activitysList[key]?.after_deadline_date && activitysList[key]?.after_deadline_date != '') ?  `${activitysList[key]?.after_deadline_date} 00:00:00` : null,
                                consider_after_deadline: activitysList[key]?.consider_after_deadline ? activitysList[key]?.consider_after_deadline : 0,
                                alt_act_point: activitysList[key]?.alt_act_point ? activitysList[key]?.alt_act_point : "",
                                steps: activitysList[key]?.steps ? activitysList[key]?.steps : "0",
                                min_act_req_camp: activitysList[key]?.min_act_req_camp ? activitysList[key]?.min_act_req_camp : "0",
                                order_id: activitysList[key]?.order_id ? activitysList[key]?.order_id : "0",
                                category_visibility: activitysList[key]?.category_visibility ? activitysList[key]?.category_visibility : 0,
                                is_display_status: activitysList[key]?.is_display_status ? activitysList[key]?.is_display_status : 0,
                                is_hidden_on_activity_page: activitysList[key]?.is_hidden_on_activity_page ? activitysList[key]?.is_hidden_on_activity_page : 0,
                                opentype: activitysList[key]?.opentype ? activitysList[key]?.opentype : 0,
                                openinternal: activitysList[key]?.openinternal ? activitysList[key]?.openinternal : 0,
                                openexternal: activitysList[key]?.openexternal ? activitysList[key]?.openexternal : 0,
                                video: activitysList[key]?.video ? activitysList[key]?.video : 0,
                                source_type: activitysList[key]?.source_type ? activitysList[key]?.source_type : 0,
                                count_type: activitysList[key]?.count_type ? activitysList[key]?.count_type : 0,
                                status: 1,
                            };
                        }
                    }
                    if(Object.keys(insertActivityData)?.length > 0){
                        insertActivityData = Object.values(insertActivityData);
                        let insertedActivityDatas = await this.campaignActivityService.save(insertActivityData);
                        insertedActivitysIds = insertedActivityDatas.identifiers.map((item) => item.id);
                    }
                }
                let insertedChallengeIds = [];
                if(Object.keys(challengesList)?.length > 0 && getChallengeDatas?.length > 0 && Object.keys(challengesList)?.length == getChallengeDatas?.length){
                    let insertChallengeData = Object.create(null);
                    for (const key in challengesList) {
                        let singleChallengeData = getChallengeDatas.find((data: any) => data.id == key);
                        if(singleChallengeData){
                            insertChallengeData[key] = {
                                campaign_id: postData?.campaign_id,
                                reward_id: postData?.reward_id,
                                challenge_id: singleChallengeData?.challenge_id,
                                challenge_schedule_id: singleChallengeData?.id,
                                reward_for: challengesList[key]?.reward_for ? challengesList[key]?.reward_for : 0,
                                point: challengesList[key]?.point ? challengesList[key]?.point : 0,
                                order_id: challengesList[key]?.order_id ? challengesList[key]?.order_id : "0",
                                start_date: (challengesList[key]?.start_date && challengesList[key]?.start_date != '') ? `${challengesList[key]?.start_date} 00:00:00`  : '',
                                end_date: (challengesList[key]?.end_date && challengesList[key]?.end_date != '') ?  `${challengesList[key]?.end_date} 00:00:00` : '',
                                point_end_date: (challengesList[key]?.point_end_date && challengesList[key]?.point_end_date != '') ?  `${challengesList[key]?.point_end_date} 00:00:00` : '',
                                after_deadline_date: (challengesList[key]?.after_deadline_date && challengesList[key]?.after_deadline_date != '') ?  `${challengesList[key]?.after_deadline_date} 00:00:00` : null,
                                consider_after_deadline: challengesList[key]?.consider_after_deadline ? challengesList[key]?.consider_after_deadline : 0,
                                status: 1,
                            };
                        }
                    }
                    if(Object.keys(insertChallengeData)?.length > 0){
                        insertChallengeData = Object.values(insertChallengeData);
                        let insertedActivityDatas = await this.campaignChallengeService.save(insertChallengeData);
                        insertedChallengeIds = insertedActivityDatas.identifiers.map((item) => item.id);
                    }
                }
                let insertedCategoryIds = [];
                if(Object.keys(catogorysList)?.length > 0 && getCategoryDatas?.length > 0 && Object.keys(catogorysList)?.length == getCategoryDatas?.length){
                    let insertCategoryData = Object.create(null);
                    for (const key in catogorysList) {
                        let singleCategoryData = getCategoryDatas.find((data: any) => data.id == key);
                        if(singleCategoryData){
                            insertCategoryData[key] = {
                                campaign_id: postData?.campaign_id,
                                reward_id: postData?.reward_id,
                                category_id: singleCategoryData?.id,
                                cust_name: catogorysList[key]?.cust_name ? catogorysList[key]?.cust_name : "",
                                cust_description: catogorysList[key]?.cust_description ? catogorysList[key]?.cust_description : "",
                                quentity: catogorysList[key]?.quentity ? catogorysList[key]?.quentity : "",
                                required_by_user: catogorysList[key]?.required_by_user ? catogorysList[key]?.required_by_user : "",
                                required_by_spouse: catogorysList[key]?.required_by_spouse ? catogorysList[key]?.required_by_spouse : "",
                                frequincy: catogorysList[key]?.frequincy ? catogorysList[key]?.frequincy : "",
                                frequincy_max_point: catogorysList[key]?.frequincy_max_point ? catogorysList[key]?.frequincy_max_point : "",
                                point_for_each: catogorysList[key]?.point_for_each ? catogorysList[key]?.point_for_each : "",
                                max_point: catogorysList[key]?.max_point ? catogorysList[key]?.max_point : "",
                                ac_max: catogorysList[key]?.ac_max ? catogorysList[key]?.ac_max : "",
                                ac_min: catogorysList[key]?.ac_min ? catogorysList[key]?.ac_min : "",
                                per_change: catogorysList[key]?.per_change ? catogorysList[key]?.per_change : "",
                                alt_activity: catogorysList[key]?.alt_activity ? catogorysList[key]?.alt_activity : null,
                                start_date: (catogorysList[key]?.start_date && catogorysList[key]?.start_date != '') ? `${catogorysList[key]?.start_date} 00:00:00`  : '',
                                end_date: (catogorysList[key]?.end_date && catogorysList[key]?.end_date != '') ?  `${catogorysList[key]?.end_date} 00:00:00` : '',
                                point_end_date: (catogorysList[key]?.point_end_date && catogorysList[key]?.point_end_date != '') ?  `${catogorysList[key]?.point_end_date} 00:00:00` : '',
                                after_deadline_date: (catogorysList[key]?.after_deadline_date && catogorysList[key]?.after_deadline_date != '') ?  `${catogorysList[key]?.after_deadline_date} 00:00:00` : null,
                                consider_after_deadline: catogorysList[key]?.consider_after_deadline ? catogorysList[key]?.consider_after_deadline : 0,
                                alt_act_point: catogorysList[key]?.alt_act_point ? catogorysList[key]?.alt_act_point : "",
                                order_id: catogorysList[key]?.order_id ? catogorysList[key]?.order_id : "0",
                                is_hidden_on_activity_page: catogorysList[key]?.is_hidden_on_activity_page ? catogorysList[key]?.is_hidden_on_activity_page : 0,
                                status: 1,
                            };
                        }
                    }
                    if(Object.keys(insertCategoryData)?.length > 0){
                        insertCategoryData = Object.values(insertCategoryData);
                        let insertedActivityDatas = await this.campaignCategoryService.save(insertCategoryData);
                        insertedCategoryIds = insertedActivityDatas.identifiers.map((item) => item.id);
                    }
                }
                if(insertedActivitysIds?.length > 0){
                    updateRewardData['related_activity'] = insertedActivitysIds.join(',');
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
                    { id: postData?.reward_id, campaign_id: postData?.campaign_id },
                    {
                        ...updateRewardData,
                    },
                );
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
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
     * Use to update campaign activity
     * - id and organization_id is mandatory params
     */
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: UpdateCampaignActivityInput) {
        try {
            if (req.tokenUser?.role_id != appConstant.ROLE.ADMIN && appConstant.ROLE.GLOBALCLIENTENGAGEMENTMANAGER != req.tokenUser?.role_id && (!postData?.campaign_id || !postData?.reward_id || !postData?.activityData || !postData?.organization_id)) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const checkCampaign = await this.campaignService.findOne({
                id: postData?.campaign_id, status: Not(2), organization_id: postData?.organization_id
            });
            if (!checkCampaign) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            const checkReward = await this.campaignRewardService.checkReward({
                id: postData?.reward_id, campaign_id: postData?.campaign_id, status: Not(2)
            });
            if (!checkReward) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REWARD_RECORD_NOT_FOUND"));
            }
            let activitiesData = JSON.parse(postData?.activityData);
            if(Object.keys(activitiesData)?.length > 0){
                let updateRewardData:any = Object.create(null);
                const transformToKeyValue = (array: any[],type:any) => {
                    let tempData = Object.create(null);
                    let tempDataIds = [];
                    array.map(datas => {
                        if(type == 'activitys'){
                            if(datas?.isDefine == 1){
                                tempData[Number(datas.activity_id)] = datas;
                                tempDataIds.push(Number(datas.activity_id));
                            }
                        }else if(type == 'challenges'){
                            if(datas?.isDefine == 2){
                                tempData[Number(datas.challenge_schedule_id)] = datas;
                                tempDataIds.push(Number(datas.challenge_schedule_id));
                            }
                        }else if(type == 'categorys'){
                            if(datas?.isDefine == 3){
                                tempData[Number(datas.category_id)] = datas;
                                tempDataIds.push(Number(datas.category_id));
                            }
                        }
                    });
                    let tempInfo = Object.create(null);
                    if (Object.keys(tempData)?.length > 0) {
                        tempInfo = tempData;
                        tempData = Object.create(null);
                    }
                    let tempIds = Object.create(null);
                    if (tempDataIds?.length > 0) {
                        tempIds = tempDataIds;
                        tempDataIds = [];
                    }
                    return {'tempInfo' : tempInfo, 'tempIds' : tempIds};
                };
                const activitiesDatas = {
                    activitys: transformToKeyValue(activitiesData,'activitys'),
                    challenges: transformToKeyValue(activitiesData,'challenges'),
                    categorys: transformToKeyValue(activitiesData,'categorys'),
                };
                let activitysList = activitiesDatas?.activitys?.tempInfo ? activitiesDatas?.activitys?.tempInfo : {};
                let challengesList = activitiesDatas?.challenges?.tempInfo ? activitiesDatas?.challenges?.tempInfo : {};
                let catogorysList = activitiesDatas?.categorys?.tempInfo ? activitiesDatas?.categorys?.tempInfo : {};
                let getActivityDatas = [];
                if(activitiesDatas?.activitys?.tempIds && activitiesDatas?.activitys?.tempIds?.length > 0){
                    getActivityDatas = await this.activityService.campaignActivityRecord({id: In(activitiesDatas?.activitys?.tempIds), status: 1}, ['activity', 'category'], {'category.id' : 'ASC'});
                }
                let getCategoryDatas = [];
                if(activitiesDatas?.categorys?.tempIds && activitiesDatas?.categorys?.tempIds?.length > 0){
                    getCategoryDatas = await this.categoryService.listRecord(null, {id: In(activitiesDatas?.categorys?.tempIds), status: 1});
                }
                let getChallengeDatas = [];
                if(activitiesDatas?.challenges?.tempIds && activitiesDatas?.challenges?.tempIds?.length > 0){
                    getChallengeDatas = await this.scheduleChallengeService.listRecord({id: In(activitiesDatas?.challenges?.tempIds), status: 1}, { id: 'DESC' }, ['sc', 'ch']);
                }
                let getExistingActivityDatas = await this.campaignActivityService.listRecord({campaign_id: postData?.campaign_id,reward_id: postData?.reward_id, status: Not(2)}, {'order_id' : 'ASC'},  ['campaignactivity.id','campaignactivity.order_id','campaignactivity.campaign_id','campaignactivity.activity_id','campaignactivity.reward_id'], 'no');
                let ExistingActivityIDS = [];
                getExistingActivityDatas.map((data: any) => {
                    ExistingActivityIDS.push(data.id);
                });
                let getExistingCategoryDatas = await this.campaignCategoryService.listRecord({campaign_id: postData?.campaign_id,reward_id: postData?.reward_id, status: Not(2)}, {'order_id' : 'ASC'},  ['campaigncategory.id','campaigncategory.order_id','campaigncategory.campaign_id','campaigncategory.category_id','campaigncategory.reward_id'], 'no');
                let ExistingCategoryIDS = [];
                getExistingCategoryDatas.map((data: any) => {
                    ExistingCategoryIDS.push(data.id);
                });
                let getExistingChallengeDatas = await this.campaignChallengeService.listRecord({campaign_id: postData?.campaign_id,reward_id: postData?.reward_id, status: Not(2)}, {'order_id' : 'ASC'},  ['campaignchallenge.id','campaignchallenge.order_id','campaignchallenge.campaign_id','campaignchallenge.challenge_id','campaignchallenge.challenge_schedule_id','campaignchallenge.reward_id'], 'no');
                let ExistingChallengeIDS = [];
                getExistingChallengeDatas.map((data: any) => {
                    ExistingChallengeIDS.push(data.id);
                });
                let insertedActivitysIds = [];
                let updatedActivitysIds = [];
                if(Object.keys(activitysList)?.length > 0 && getActivityDatas?.length > 0 && Object.keys(activitysList)?.length == getActivityDatas?.length){
                    let insertActivityData = Object.create(null);
                    for (const key in activitysList) {
                        let singleActivityData = getActivityDatas.find((data: any) => data.id == key);
                        if(singleActivityData){
                            let actId = activitysList[key]?.id;
                            if(activitysList[key]?.id){
                                updatedActivitysIds.push(actId);
                                let updateActivityData = {
                                    campaign_id: postData?.campaign_id,
                                    reward_id: postData?.reward_id,
                                    activity_id: singleActivityData?.id,
                                    cust_name: activitysList[key]?.cust_name ? activitysList[key]?.cust_name : "",
                                    cust_description: activitysList[key]?.cust_description ? activitysList[key]?.cust_description : "",
                                    quentity: activitysList[key]?.quentity ? activitysList[key]?.quentity : "",
                                    required_by_user: activitysList[key]?.required_by_user ? activitysList[key]?.required_by_user : "",
                                    required_by_spouse: activitysList[key]?.required_by_spouse ? activitysList[key]?.required_by_spouse : "",
                                    frequincy: activitysList[key]?.frequincy ? activitysList[key]?.frequincy : "",
                                    frequincy_max_point: activitysList[key]?.frequincy_max_point ? activitysList[key]?.frequincy_max_point : "",
                                    point_for_each: activitysList[key]?.point_for_each ? activitysList[key]?.point_for_each : "",
                                    max_point: activitysList[key]?.max_point ? activitysList[key]?.max_point : "",
                                    ac_max: activitysList[key]?.ac_max ? activitysList[key]?.ac_max : "",
                                    ac_min: activitysList[key]?.ac_min ? activitysList[key]?.ac_min : "",
                                    per_change: activitysList[key]?.per_change ? activitysList[key]?.per_change : "",
                                    alt_activity: activitysList[key]?.alt_activity ? activitysList[key]?.alt_activity : null,
                                    start_date: (activitysList[key]?.start_date && activitysList[key]?.start_date != '') ? `${activitysList[key]?.start_date} 00:00:00`  : '',
                                    end_date: (activitysList[key]?.end_date && activitysList[key]?.end_date != '') ?  `${activitysList[key]?.end_date} 00:00:00` : '',
                                    point_end_date: (activitysList[key]?.point_end_date && activitysList[key]?.point_end_date != '') ?  `${activitysList[key]?.point_end_date} 00:00:00` : '',
                                    after_deadline_date: (activitysList[key]?.after_deadline_date && activitysList[key]?.after_deadline_date != '') ?  `${activitysList[key]?.after_deadline_date} 00:00:00` : '',
                                    consider_after_deadline: activitysList[key]?.consider_after_deadline ? activitysList[key]?.consider_after_deadline : 0,
                                    alt_act_point: activitysList[key]?.alt_act_point ? activitysList[key]?.alt_act_point : "",
                                    steps: activitysList[key]?.steps ? activitysList[key]?.steps : "0",
                                    min_act_req_camp: activitysList[key]?.min_act_req_camp ? activitysList[key]?.min_act_req_camp : "0",
                                    order_id: activitysList[key]?.order_id ? activitysList[key]?.order_id : "0",
                                    category_visibility: activitysList[key]?.category_visibility ? activitysList[key]?.category_visibility : 0,
                                    is_display_status: activitysList[key]?.is_display_status ? activitysList[key]?.is_display_status : 0,
                                    is_hidden_on_activity_page: activitysList[key]?.is_hidden_on_activity_page ? activitysList[key]?.is_hidden_on_activity_page : 0,
                                    opentype: activitysList[key]?.opentype ? activitysList[key]?.opentype : 0,
                                    openinternal: activitysList[key]?.openinternal ? activitysList[key]?.openinternal : 0,
                                    openexternal: activitysList[key]?.openexternal ? activitysList[key]?.openexternal : 0,
                                    video: activitysList[key]?.video ? activitysList[key]?.video : 0,
                                    source_type: activitysList[key]?.source_type ? activitysList[key]?.source_type : 0,
                                    count_type: activitysList[key]?.count_type ? activitysList[key]?.count_type : 0,
                                };
                                await this.campaignActivityService.update(
                                    { id: actId },
                                    {
                                        ...updateActivityData,
                                    },
                                );
                            }else{
                                insertActivityData[key] = {
                                    campaign_id: postData?.campaign_id,
                                    reward_id: postData?.reward_id,
                                    activity_id: singleActivityData?.id,
                                    cust_name: activitysList[key]?.cust_name ? activitysList[key]?.cust_name : "",
                                    cust_description: activitysList[key]?.cust_description ? activitysList[key]?.cust_description : "",
                                    quentity: activitysList[key]?.quentity ? activitysList[key]?.quentity : "",
                                    required_by_user: activitysList[key]?.required_by_user ? activitysList[key]?.required_by_user : "",
                                    required_by_spouse: activitysList[key]?.required_by_spouse ? activitysList[key]?.required_by_spouse : "",
                                    frequincy: activitysList[key]?.frequincy ? activitysList[key]?.frequincy : "",
                                    frequincy_max_point: activitysList[key]?.frequincy_max_point ? activitysList[key]?.frequincy_max_point : "",
                                    point_for_each: activitysList[key]?.point_for_each ? activitysList[key]?.point_for_each : "",
                                    max_point: activitysList[key]?.max_point ? activitysList[key]?.max_point : "",
                                    ac_max: activitysList[key]?.ac_max ? activitysList[key]?.ac_max : "",
                                    ac_min: activitysList[key]?.ac_min ? activitysList[key]?.ac_min : "",
                                    per_change: activitysList[key]?.per_change ? activitysList[key]?.per_change : "",
                                    alt_activity: activitysList[key]?.alt_activity ? activitysList[key]?.alt_activity : null,
                                    start_date: (activitysList[key]?.start_date && activitysList[key]?.start_date != '') ? `${activitysList[key]?.start_date} 00:00:00`  : '',
                                    end_date: (activitysList[key]?.end_date && activitysList[key]?.end_date != '') ?  `${activitysList[key]?.end_date} 00:00:00` : '',
                                    point_end_date: (activitysList[key]?.point_end_date && activitysList[key]?.point_end_date != '') ?  `${activitysList[key]?.point_end_date} 00:00:00` : '',
                                    after_deadline_date: (activitysList[key]?.after_deadline_date && activitysList[key]?.after_deadline_date != '') ?  `${activitysList[key]?.after_deadline_date} 00:00:00` : '',
                                    consider_after_deadline: activitysList[key]?.consider_after_deadline ? activitysList[key]?.consider_after_deadline : 0,
                                    alt_act_point: activitysList[key]?.alt_act_point ? activitysList[key]?.alt_act_point : "",
                                    steps: activitysList[key]?.steps ? activitysList[key]?.steps : "0",
                                    min_act_req_camp: activitysList[key]?.min_act_req_camp ? activitysList[key]?.min_act_req_camp : "0",
                                    order_id: activitysList[key]?.order_id ? activitysList[key]?.order_id : "0",
                                    category_visibility: activitysList[key]?.category_visibility ? activitysList[key]?.category_visibility : 0,
                                    is_display_status: activitysList[key]?.is_display_status ? activitysList[key]?.is_display_status : 0,
                                    is_hidden_on_activity_page: activitysList[key]?.is_hidden_on_activity_page ? activitysList[key]?.is_hidden_on_activity_page : 0,
                                    opentype: activitysList[key]?.opentype ? activitysList[key]?.opentype : 0,
                                    openinternal: activitysList[key]?.openinternal ? activitysList[key]?.openinternal : 0,
                                    openexternal: activitysList[key]?.openexternal ? activitysList[key]?.openexternal : 0,
                                    video: activitysList[key]?.video ? activitysList[key]?.video : 0,
                                    source_type: activitysList[key]?.source_type ? activitysList[key]?.source_type : 0,
                                    count_type: activitysList[key]?.count_type ? activitysList[key]?.count_type : 0,
                                    status: 1,
                                };
                            }
                        }
                    }
                    if(Object.keys(insertActivityData)?.length > 0){
                        insertActivityData = Object.values(insertActivityData);
                        let insertedActivityDatas = await this.campaignActivityService.save(insertActivityData);
                        insertedActivitysIds = insertedActivityDatas.identifiers.map((item) => item.id);
                    }
                }
                const activityDeletedIds = ExistingActivityIDS.filter(id => !updatedActivitysIds.includes(id));
                if(activityDeletedIds.length > 0){
                    for(let i = 0; i < activityDeletedIds?.length; i++){
                        await this.campaignActivityService.update(
                            { id: activityDeletedIds[i] },
                            {
                                status: 2,
                            },
                        );
                        this.activityLogService.create({id: activityDeletedIds[i], status: 1}, {status: 2}, tableConstant.CAMPAIGN.TBL_CAMPAIGN_ACTIVITY, req.tokenUser?.id, 'delete camaign activity');
                    }
                }
                let newUpdatedActivityIds = insertedActivitysIds.concat(updatedActivitysIds);
                if(newUpdatedActivityIds?.length > 0){
                    updateRewardData['related_activity'] = newUpdatedActivityIds.join(',');
                }else{
                    updateRewardData['related_activity'] = '';
                }
                let insertedChallengesIds = [];
                let updatedChallengeIds = [];
                if(Object.keys(challengesList)?.length > 0 && getChallengeDatas?.length > 0 && Object.keys(challengesList)?.length == getChallengeDatas?.length){
                    let insertChallengeData = Object.create(null);
                    for (const key in challengesList) {
                        let singleChallengeData = getChallengeDatas.find((data: any) => data.id == key);
                        if(singleChallengeData){
                            let challId = challengesList[key]?.id;
                            if(challengesList[key]?.id){
                                updatedChallengeIds.push(challId);
                                let updateChallengeData = {
                                    campaign_id: postData?.campaign_id,
                                    reward_id: postData?.reward_id,
                                    challenge_id: singleChallengeData?.challenge_id,
                                    challenge_schedule_id: singleChallengeData?.id,
                                    reward_for: challengesList[key]?.reward_for ? challengesList[key]?.reward_for : 0,
                                    point: challengesList[key]?.point ? challengesList[key]?.point : 0,
                                    order_id: challengesList[key]?.order_id ? challengesList[key]?.order_id : "0",
                                    start_date: (challengesList[key]?.start_date && challengesList[key]?.start_date != '') ? `${challengesList[key]?.start_date} 00:00:00`  : '',
                                    end_date: (challengesList[key]?.end_date && challengesList[key]?.end_date != '') ?  `${challengesList[key]?.end_date} 00:00:00` : '',
                                    point_end_date: (challengesList[key]?.point_end_date && challengesList[key]?.point_end_date != '') ?  `${challengesList[key]?.point_end_date} 00:00:00` : '',
                                    after_deadline_date: (challengesList[key]?.after_deadline_date && challengesList[key]?.after_deadline_date != '') ?  `${challengesList[key]?.after_deadline_date} 00:00:00` : '',
                                    consider_after_deadline: challengesList[key]?.consider_after_deadline ? challengesList[key]?.consider_after_deadline : 0
                                };
                                await this.campaignChallengeService.update(
                                    { id: challId },
                                    {
                                        ...updateChallengeData,
                                    },
                                );
                            }else{
                                insertChallengeData[key] = {
                                    campaign_id: postData?.campaign_id,
                                    reward_id: postData?.reward_id,
                                    challenge_id: singleChallengeData?.challenge_id,
                                    challenge_schedule_id: singleChallengeData?.id,
                                    reward_for: challengesList[key]?.reward_for ? challengesList[key]?.reward_for : 0,
                                    point: challengesList[key]?.point ? challengesList[key]?.point : 0,
                                    order_id: challengesList[key]?.order_id ? challengesList[key]?.order_id : "0",
                                    start_date: (challengesList[key]?.start_date && challengesList[key]?.start_date != '') ? `${challengesList[key]?.start_date} 00:00:00`  : '',
                                    end_date: (challengesList[key]?.end_date && challengesList[key]?.end_date != '') ?  `${challengesList[key]?.end_date} 00:00:00` : '',
                                    point_end_date: (challengesList[key]?.point_end_date && challengesList[key]?.point_end_date != '') ?  `${challengesList[key]?.point_end_date} 00:00:00` : '',
                                    after_deadline_date: (challengesList[key]?.after_deadline_date && challengesList[key]?.after_deadline_date != '') ?  `${challengesList[key]?.after_deadline_date} 00:00:00` : '',
                                    consider_after_deadline: challengesList[key]?.consider_after_deadline ? challengesList[key]?.consider_after_deadline : 0,
                                    status:1
                                };
                            }
                        }
                    }
                    if(Object.keys(insertChallengeData)?.length > 0){
                        insertChallengeData = Object.values(insertChallengeData);
                        let insertedActivityDatas = await this.campaignChallengeService.save(insertChallengeData);
                        insertedChallengesIds = insertedActivityDatas.identifiers.map((item) => item.id);
                    }
                }
                const challengeDeletedIds = ExistingChallengeIDS.filter(id => !updatedChallengeIds.includes(id));
                if(challengeDeletedIds.length > 0){
                    for(let i = 0; i < challengeDeletedIds?.length; i++){
                        await this.campaignChallengeService.update(
                            { id: challengeDeletedIds[i] },
                            {
                                status: 2,
                            },
                        );
                        this.activityLogService.create({id: challengeDeletedIds[i], status: 1}, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete camaign challenge');
                    }
                }
                let newUpdatedChallengesIds = insertedChallengesIds.concat(updatedChallengeIds);
                if(newUpdatedChallengesIds?.length > 0){
                    updateRewardData['related_challenge'] = newUpdatedChallengesIds.join(',');
                }else{
                    updateRewardData['related_challenge'] = '';
                }
                let insertedCategorysIds = [];
                let updatedCategorysIds = [];
                if(Object.keys(catogorysList)?.length > 0 && getCategoryDatas?.length > 0 && Object.keys(catogorysList)?.length == getCategoryDatas?.length){
                    let insertCategoryData = Object.create(null);
                    for (const key in catogorysList) {
                        let singleCategoryData = getCategoryDatas.find((data: any) => data.id == key);
                        if(singleCategoryData){
                            let catId = catogorysList[key]?.id;
                            if(catogorysList[key]?.id){
                                updatedCategorysIds.push(catId);
                                let updateCategoryData = {
                                    campaign_id: postData?.campaign_id,
                                    reward_id: postData?.reward_id,
                                    category_id: singleCategoryData?.id,
                                    cust_name: catogorysList[key]?.cust_name ? catogorysList[key]?.cust_name : "",
                                    cust_description: catogorysList[key]?.cust_description ? catogorysList[key]?.cust_description : "",
                                    quentity: catogorysList[key]?.quentity ? catogorysList[key]?.quentity : "",
                                    required_by_user: catogorysList[key]?.required_by_user ? catogorysList[key]?.required_by_user : "",
                                    required_by_spouse: catogorysList[key]?.required_by_spouse ? catogorysList[key]?.required_by_spouse : "",
                                    frequincy: catogorysList[key]?.frequincy ? catogorysList[key]?.frequincy : "",
                                    frequincy_max_point: catogorysList[key]?.frequincy_max_point ? catogorysList[key]?.frequincy_max_point : "",
                                    point_for_each: catogorysList[key]?.point_for_each ? catogorysList[key]?.point_for_each : "",
                                    max_point: catogorysList[key]?.max_point ? catogorysList[key]?.max_point : "",
                                    ac_max: catogorysList[key]?.ac_max ? catogorysList[key]?.ac_max : "",
                                    ac_min: catogorysList[key]?.ac_min ? catogorysList[key]?.ac_min : "",
                                    per_change: catogorysList[key]?.per_change ? catogorysList[key]?.per_change : "",
                                    alt_activity: catogorysList[key]?.alt_activity ? catogorysList[key]?.alt_activity : null,
                                    start_date: (catogorysList[key]?.start_date && catogorysList[key]?.start_date != '') ? `${catogorysList[key]?.start_date} 00:00:00`  : '',
                                    end_date: (catogorysList[key]?.end_date && catogorysList[key]?.end_date != '') ?  `${catogorysList[key]?.end_date} 00:00:00` : '',
                                    point_end_date: (catogorysList[key]?.point_end_date && catogorysList[key]?.point_end_date != '') ?  `${catogorysList[key]?.point_end_date} 00:00:00` : '',
                                    after_deadline_date: (catogorysList[key]?.after_deadline_date && catogorysList[key]?.after_deadline_date != '') ?  `${catogorysList[key]?.after_deadline_date} 00:00:00` : '',
                                    consider_after_deadline: catogorysList[key]?.consider_after_deadline ? catogorysList[key]?.consider_after_deadline : 0,
                                    alt_act_point: catogorysList[key]?.alt_act_point ? catogorysList[key]?.alt_act_point : "",
                                    order_id: catogorysList[key]?.order_id ? catogorysList[key]?.order_id : "0",
                                    is_hidden_on_activity_page: catogorysList[key]?.is_hidden_on_activity_page ? catogorysList[key]?.is_hidden_on_activity_page : 0,
                                };
                                await this.campaignCategoryService.update(
                                    { id: catId },
                                    {
                                        ...updateCategoryData,
                                    },
                                );
                            }else{
                                insertCategoryData[key] = {
                                    campaign_id: postData?.campaign_id,
                                    reward_id: postData?.reward_id,
                                    category_id: singleCategoryData?.id,
                                    cust_name: catogorysList[key]?.cust_name ? catogorysList[key]?.cust_name : "",
                                    cust_description: catogorysList[key]?.cust_description ? catogorysList[key]?.cust_description : "",
                                    quentity: catogorysList[key]?.quentity ? catogorysList[key]?.quentity : "",
                                    required_by_user: catogorysList[key]?.required_by_user ? catogorysList[key]?.required_by_user : "",
                                    required_by_spouse: catogorysList[key]?.required_by_spouse ? catogorysList[key]?.required_by_spouse : "",
                                    frequincy: catogorysList[key]?.frequincy ? catogorysList[key]?.frequincy : "",
                                    frequincy_max_point: catogorysList[key]?.frequincy_max_point ? catogorysList[key]?.frequincy_max_point : "",
                                    point_for_each: catogorysList[key]?.point_for_each ? catogorysList[key]?.point_for_each : "",
                                    max_point: catogorysList[key]?.max_point ? catogorysList[key]?.max_point : "",
                                    ac_max: catogorysList[key]?.ac_max ? catogorysList[key]?.ac_max : "",
                                    ac_min: catogorysList[key]?.ac_min ? catogorysList[key]?.ac_min : "",
                                    per_change: catogorysList[key]?.per_change ? catogorysList[key]?.per_change : "",
                                    alt_activity: catogorysList[key]?.alt_activity ? catogorysList[key]?.alt_activity : null,
                                    start_date: (catogorysList[key]?.start_date && catogorysList[key]?.start_date != '') ? `${catogorysList[key]?.start_date} 00:00:00`  : '',
                                    end_date: (catogorysList[key]?.end_date && catogorysList[key]?.end_date != '') ?  `${catogorysList[key]?.end_date} 00:00:00` : '',
                                    point_end_date: (catogorysList[key]?.point_end_date && catogorysList[key]?.point_end_date != '') ?  `${catogorysList[key]?.point_end_date} 00:00:00` : '',
                                    after_deadline_date: (catogorysList[key]?.after_deadline_date && catogorysList[key]?.after_deadline_date != '') ?  `${catogorysList[key]?.after_deadline_date} 00:00:00` : '',
                                    consider_after_deadline: catogorysList[key]?.consider_after_deadline ? catogorysList[key]?.consider_after_deadline : 0,
                                    alt_act_point: catogorysList[key]?.alt_act_point ? catogorysList[key]?.alt_act_point : "",
                                    order_id: catogorysList[key]?.order_id ? catogorysList[key]?.order_id : "0",
                                    is_hidden_on_activity_page: catogorysList[key]?.is_hidden_on_activity_page ? catogorysList[key]?.is_hidden_on_activity_page : 0,
                                    status: 1,
                                };
                            }
                        }
                    }
                    if(Object.keys(insertCategoryData)?.length > 0){
                        insertCategoryData = Object.values(insertCategoryData);
                        let insertedActivityDatas = await this.campaignCategoryService.save(insertCategoryData);
                        insertedCategorysIds = insertedActivityDatas.identifiers.map((item) => item.id);
                    } 
                }
                const categoryDeletedIds = ExistingCategoryIDS.filter(id => !updatedCategorysIds.includes(id));
                if(categoryDeletedIds.length > 0){
                    for(let i = 0; i < categoryDeletedIds?.length; i++){
                        await this.campaignCategoryService.update(
                            { id: categoryDeletedIds[i] },
                            {
                                status: 2,
                            },
                        );
                        this.activityLogService.create({id: categoryDeletedIds[i], status: 1}, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CATEGORY, req.tokenUser?.id, 'delete camaign category');
                    }
                }
                let newUpdatedCategoryIds = insertedCategorysIds.concat(updatedCategorysIds);
                if(newUpdatedCategoryIds?.length > 0){
                    updateRewardData['related_category'] = newUpdatedCategoryIds.join(',');
                }else{
                    updateRewardData['related_category'] = '';
                }
                await this.campaignRewardService.update(
                    { id: postData?.reward_id, campaign_id: postData?.campaign_id },
                    {
                        ...updateRewardData,
                    },
                );
                /* Activity Data update in english file */
                    let activitysDataAll = await this.campaignActivityService.campaignActivityList({id: In(newUpdatedActivityIds), status: 1}, ['campaignactivity', 'activity']);
                    let challengesDataAll = await this.campaignChallengeService.listRecord({id: In(newUpdatedChallengesIds), status: 1}, '', ['campaignchallenge', 'sc', 'ch'],'yes');
                    let categorysDataAll = await this.campaignCategoryService.listRecord({id: In(newUpdatedCategoryIds), status: 1}, '', ['campaigncategory', 'category'], 'yes');
                    let dynamicDatas = Object.create(null);
                    if(activitysDataAll && activitysDataAll.length > 0){
                        for (const key in activitysDataAll) {
                            let actId = activitysDataAll[key]?.id;
                            let tilteA = `activity_name_${postData?.campaign_id}_${postData?.reward_id}_${actId}`;
                            dynamicDatas[`${tilteA}`] = activitysDataAll[key]?.cust_name ? activitysDataAll[key]?.cust_name : "";
                            if(dynamicDatas[`${tilteA}`] == ''){
                                dynamicDatas[`${tilteA}`]= activitysDataAll[key]?.['activity']?.activity_name;
                            }  
                            let discriptionA = `activity_desc_${postData?.campaign_id}_${postData?.reward_id}_${actId}`;
                            dynamicDatas[`${discriptionA}`] = activitysDataAll[key]?.cust_description ? activitysDataAll[key]?.cust_description : "";
                            if(dynamicDatas[`${discriptionA}`] == ''){
                                dynamicDatas[`${discriptionA}`] = activitysDataAll[key]?.['activity']?.description;
                            }
                        }
                    }
                    if(categorysDataAll && categorysDataAll.length > 0){
                        for (const key in categorysDataAll) {
                            let CTId = categorysDataAll[key]?.id;
                            let tilteC = `category_name_${postData?.campaign_id}_${postData?.reward_id}_${CTId}`;
                            dynamicDatas[`${tilteC}`] = categorysDataAll[key]?.cust_name ? categorysDataAll[key]?.cust_name : "";
                            if(dynamicDatas[`${tilteC}`] == ''){
                                dynamicDatas[`${tilteC}`]= categorysDataAll[key]?.['category']?.category_name;
                            }  
                            let discriptionC = `category_desc_${postData?.campaign_id}_${postData?.reward_id}_${CTId}`;
                            dynamicDatas[`${discriptionC}`] = categorysDataAll[key]?.cust_description ? categorysDataAll[key]?.cust_description : "";
                            if(dynamicDatas[`${discriptionC}`] == ''){
                                dynamicDatas[`${discriptionC}`] = categorysDataAll[key]?.['category']?.description;
                            }
                        }
                    }
                    if(challengesDataAll && challengesDataAll.length > 0){
                        for (const key in challengesDataAll) {
                            let CHId = challengesDataAll[key]?.id;
                            let tilteCH = `challenge_name_${postData?.campaign_id}_${postData?.reward_id}_${CHId}`;
                            dynamicDatas[`${tilteCH}`] = challengesDataAll[key]?.['sc']?.custom_cname ? challengesDataAll[key]?.['sc']?.custom_cname : "";
                            if(dynamicDatas[`${tilteCH}`] == ''){
                                dynamicDatas[`${tilteCH}`]= challengesDataAll[key]?.['ch']?.challenge_name;
                            }  
                            let discriptionCH = `challenge_desc_${postData?.campaign_id}_${postData?.reward_id}_${CHId}`;
                            dynamicDatas[`${discriptionCH}`] = challengesDataAll[key]?.['sc']?.custom_desc ? challengesDataAll[key]?.['sc']?.custom_desc : "";
                            if(dynamicDatas[`${discriptionCH}`] == ''){
                                dynamicDatas[`${discriptionCH}`] = challengesDataAll[key]?.['ch']?.challenge_desc;
                            }
                        }
                    }
                    if(dynamicDatas && Object.keys(dynamicDatas)?.length > 0){
                        await this.translatorService.DynamicEngJsonData('Campaign',postData?.organization_id,dynamicDatas,'Edit','Campaigns',postData?.campaign_id);
                    }
                /* Activity Data update in english file */
            }else{
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_SOMETHING_WENT_WRONG"));
            }
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
     * Use to delete a Campaign Activity
     * - id and organization_id is mandatory params
     */
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const where = { id: postData?.id, organization_id: postData?.company_id, status: Not(2) };
            let campaignDetails = await this.campaignActivityService.findOne(where);
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
            await this.campaignActivityService.update(
              { id: postData?.id },
              {
                status: 2
              },
            );
            this.activityLogService.create(campaignDetails, {status: 2}, tableConstant.CAMPAIGN.TBL_CAMPAIGN_ACTIVITY, req.tokenUser?.id, 'delete');
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
}
