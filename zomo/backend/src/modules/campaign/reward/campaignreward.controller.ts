import { CampaignActivityDto, CampaignCategoryDto, CampaignChallengeDto, CampaignRewardDto, CommonArrayService, CommonService, tableConstant } from '@common-constants';
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
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { TranslationService } from "src/modules/translation/translation.service";
import { In, Not } from "typeorm";
import { AccessGuard, TokenGuard } from '../../../guard';
import { ActivityService } from "../../activity/activity/activity.service";
import { InterlinksService } from "../../company/interlinks/interlinks.service";
import { WellBeingPostService } from "../../emotionalwellbeing/wellbeingpost/wellbeingpost.service";
import { FitnessVideosService } from "../../mediafitness/videos/fitnessvideos.service";
import { CampaignService } from "../campaign/campaign.service";
import { CampaignActivityService } from "../campaignactivity/campaignactivity.service";
import { CashRewardService } from "../cashreward/cashreward.service";
import { CampaignCategoryService } from "../category/campaigncategory.service";
import { CampaignChallengeService } from "../challenge/campaignchallenge.service";
import { PaginateWithCampaignInput } from '../input';
import { InsurancePlanService } from "../insuranceplan/insuranceplan.service";
import { InsuranceRewardService } from "../insurancereward/insurancereward.service";
import { OtherRewardService } from "../otherreward/otherreward.service";
import { CampaignRewardService } from "./campaignreward.service";
@Controller('campaign/reward')
@UseGuards(TokenGuard, AccessGuard)
export class CampaignRewardController {
    constructor(
        private readonly campaignRewardService: CampaignRewardService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly insuranceRewardService: InsuranceRewardService,
        private readonly cashRewardService: CashRewardService,
        private readonly otherRewardService: OtherRewardService,
        private readonly campaignService: CampaignService,
        private readonly campaignActivityService: CampaignActivityService,
        private readonly campaignChallengeService: CampaignChallengeService,
        private readonly campaignCategoryService: CampaignCategoryService,
        private readonly fitnessVideosService: FitnessVideosService,
        private readonly wellbeingPostService: WellBeingPostService,
        private readonly activityService: ActivityService,
        private readonly interlinksService: InterlinksService,
        private readonly insurancePlanService: InsurancePlanService
    ) {}
    @Post('paginate')
    async paginate(@Req() req: Request, @Res() res: Response, @Body() postData: PaginateWithCampaignInput) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = `campaignreward.status != 2 `;
            if (postData?.campaign_id) {
                where += `AND campaignreward.campaign_id = '${postData?.campaign_id}'`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['campaignreward.reward_name','campaignreward.reward_desc','campaignreward.related_activity','campaignreward.related_challenge','campaignreward.related_category']);
            }
            const resultedData = await this.campaignRewardService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(CampaignRewardDto, resultedData['list'], req.lang)
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
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.reward_id || !postData?.campaign_id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const campaignPlanCheck = await this.campaignService.findOne({
                id: postData?.campaign_id, status: Not(2), organization_id: postData?.organization_id
            });
            if (!campaignPlanCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            const where = { id: postData?.reward_id, campaign_id: postData?.campaign_id, status: Not(2) };
            let rewardDetails = await this.campaignRewardService.getOne(where,['campaignreward','insurance','cash','other'],'full');
            if (!rewardDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REWARD_RECORD_NOT_FOUND"));
            }
            rewardDetails = <any>(
                await this.commonArrayService.formatToDto(CampaignRewardDto, rewardDetails, req.lang)
            );
            if(rewardDetails['insurance'].length > 0){
                const getAllInsurancePlan:any = await this.insurancePlanService.listRecord({ status : 1}, null, ['id','plan_name']);
                rewardDetails['insurance'] = rewardDetails['insurance'].map((item) => {
                    if(item?.ins_id != 0){
                        let getPlan = getAllInsurancePlan.find((plan) => plan?.id == item?.ins_id);
                        if(!item['plan']){
                            item['plan'] = Object.create(null);
                        }
                        item['plan']['id'] = getPlan?.id;
                        item['plan']['name'] = getPlan?.plan_name;
                    }
                    return item;
                });
            }
            const getAllInternalLink:any = await this.interlinksService.listRecord({ status : 1}, null, ['id','linktitle']);
            const getAllAltActivitys = await this.activityService.campaignActivityRecord(`activity.status = 1 AND activity.accebility IN (0,${postData?.organization_id})`,["activity.id AS id","activity.activity_name AS activity_name","category.category_name AS category_name"], {'category.category_name' : 'ASC', 'activity.activity_name': 'ASC'} , 'list','altactivity');
            const getAllMediaVideo = await this.fitnessVideosService.listRecord({status: '1', org_id: In([postData?.organization_id,0])},["fitness.id","fitness.name"]);
            const getAllPostVideo = await this.wellbeingPostService.campaginListRecord(`ep.status = 1 AND ep.org_id IN (0,${postData?.organization_id}) `,["ep.id as id","ep.title as title"]);
            /* GET ACTIVITIES */
                let getActivities = await this.campaignActivityService.listRecord(
                    { campaign_id: postData?.campaign_id, reward_id: postData?.reward_id, status: Not(2) },
                    { order_id: 'ASC' },
                    ['campaignactivity', 'activity.id', 'activity.activity_name','activity.accebility', 'category.id', 'category.category_name', 'category.qty_req', 'category.reqby_usr', 'category.reqby_spouse', 'category.max_freto_earn_point', 'category.point_for_each', 'category.max_point_per_cham']
                );
                getActivities = <any>(
                    await this.commonArrayService.formatToDto(CampaignActivityDto, getActivities, req.lang)
                );
                if(getActivities){
                    getActivities = getActivities.map((item) => {
                        if(item?.activity_id == 4887 && item?.video != 0){
                            let getVideo = getAllMediaVideo.find((video) => video?.id == item?.video);
                            if(!item['videos']){
                                item['videos'] = Object.create(null);
                            }
                            item['videos']['id'] = getVideo?.id;
                            item['videos']['name'] = getVideo?.name;
                        }
                        if(item?.activity_id == 5905 && item?.video != 0){
                            let getVideo = getAllPostVideo.find((video) => video?.id == item?.video);
                            if(!item['post']){
                                item['post'] = Object.create(null);
                            }
                            item['post']['id'] = getVideo?.id;
                            item['post']['title'] = getVideo?.title;
                        }
                        if(item?.alt_activity){
                            let getActivity = getAllAltActivitys.find((act) => act?.id == item?.alt_activity);
                            if(!item['altactivity']){
                                item['altactivity'] = Object.create(null);
                            }
                            item['altactivity']['id'] = getActivity?.id;
                            item['altactivity']['activity_name'] = getActivity?.activity_name;
                        }
                        if(item?.opentype == 1 || item?.opentype == 2){
                            let getLink = getAllInternalLink.find((link) => link?.id == item?.openinternal);
                            if(!item['interlinks']){
                                item['interlinks'] = Object.create(null);
                            }
                            item['interlinks']['id'] = getLink?.id;
                            item['interlinks']['linktitle'] = getLink?.linktitle;
                        }
                        return item;
                    }); 
                }
                let getChallenges: any = await this.campaignChallengeService.listRecord(
                    { campaign_id: postData?.campaign_id, reward_id: postData?.reward_id, status: Not(2) },
                    { order_id: 'ASC' },
                    ['campaignchallenge','sc.id','sc.custom_cname','ch.id','ch.challenge_name'],
                    'yes'
                );
                getChallenges = <any>(
                    await this.commonArrayService.formatToDto(CampaignChallengeDto, getChallenges, req.lang)
                );
                let getCategory = await this.campaignCategoryService.listRecord(
                    { campaign_id: postData?.campaign_id, reward_id: postData?.reward_id, status: Not(2) },
                    { order_id: 'ASC' },
                    ['campaigncategory', 'category.id', 'category.category_name', 'category.qty_req', 'category.reqby_usr', 'category.reqby_spouse', 'category.max_freto_earn_point', 'category.point_for_each', 'category.max_point_per_cham']
                );
                getCategory = <any>(
                    await this.commonArrayService.formatToDto(CampaignCategoryDto, getCategory, req.lang)
                );
                const mergedArray = [
                    ...getActivities.map((item) => ({ ...item, isDefine: 1 })), // Add source key if needed
                    ...getChallenges.map((item) => ({ ...item, isDefine: 2 })),
                    ...getCategory.map((item) => ({ ...item, isDefine: 3 })),
                ];
                const sortedArray = mergedArray.sort((a, b) => {
                    if (a.order_id === 0) return 1;
                    if (b.order_id === 0) return -1;
                    return a.order_id - b.order_id;
                });
            /* GET ACTIVITIES */
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: {'rewards' : rewardDetails, 'Activities' : sortedArray},
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
    @Post('view')
    async getAllList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.campaign_id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const campaignPlanCheck = await this.campaignService.findOne({
                id: postData?.campaign_id, status: Not(2), organization_id: postData?.organization_id
            });
            if (!campaignPlanCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            let getRewardIds = await this.campaignRewardService.listofIds({ campaign_id: postData?.campaign_id, status: Not(2) });
            let rewardDatas = [];
            if(getRewardIds?.length > 0){
                const getAllInternalLink:any = await this.interlinksService.listRecord({ status : 1}, null, ['id','linktitle']);
                const getAllAltActivitys = await this.activityService.campaignActivityRecord(`activity.status = 1 AND activity.accebility IN (0,${postData?.organization_id})`,["activity.id AS id","activity.activity_name AS activity_name","category.category_name AS category_name"], {'category.category_name' : 'ASC', 'activity.activity_name': 'ASC'} , 'list','altactivity');
                const getAllMediaVideo = await this.fitnessVideosService.listRecord({status: '1', org_id: In([postData?.organization_id,0])},["fitness.id","fitness.name"]);
                const getAllPostVideo = await this.wellbeingPostService.campaginListRecord(`ep.status = 1 AND ep.org_id IN (0,${postData?.organization_id}) `,["ep.id as id","ep.title as title"]);
                for(let i = 0; i < getRewardIds?.length; i++){
                    const reward_id = getRewardIds[i];
                    const where = { id: reward_id, campaign_id: postData?.campaign_id, status: Not(2) };
                    let rewardDetails = await this.campaignRewardService.getOne(where,['campaignreward','insurance','cash','other'],'full');
                    if (rewardDetails) {
                        rewardDetails = <any>(
                            await this.commonArrayService.formatToDto(CampaignRewardDto, rewardDetails, req.lang)
                        );
                        if(rewardDetails['insurance'].length > 0){
                            const getAllInsurancePlan:any = await this.insurancePlanService.listRecord({ status : 1}, null, ['id','plan_name']);
                            rewardDetails['insurance'] = rewardDetails['insurance'].map((item) => {
                                if(item?.ins_id != 0){
                                    let getPlan = getAllInsurancePlan.find((plan) => plan?.id == item?.ins_id);
                                    if(!item['plan']){
                                        item['plan'] = Object.create(null);
                                    }
                                    item['plan']['id'] = getPlan?.id;
                                    item['plan']['name'] = getPlan?.plan_name;
                                }
                                return item;
                            });
                        }
                        /* GET ACTIVITIES */
                            let getActivities = await this.campaignActivityService.listRecord(
                                { campaign_id: postData?.campaign_id, reward_id: reward_id, status: Not(2) },
                                { order_id: 'ASC' },
                                ['campaignactivity', 'activity.id', 'activity.activity_name', 'category.id', 'category.category_name', 'category.qty_req', 'category.reqby_usr', 'category.reqby_spouse', 'category.max_freto_earn_point', 'category.point_for_each', 'category.max_point_per_cham']
                            );
                            getActivities = <any>(
                                await this.commonArrayService.formatToDto(CampaignActivityDto, getActivities, req.lang)
                            );
                            if(getActivities){
                                getActivities = getActivities.map((item) => {
                                    if(item?.activity_id == 4887 && item?.video != 0){
                                        let getVideo = getAllMediaVideo.find((video) => video?.id == item?.video);
                                        if(!item['videos']){
                                            item['videos'] = Object.create(null);
                                        }
                                        item['videos']['id'] = getVideo?.id;
                                        item['videos']['name'] = getVideo?.name;
                                    }
                                    if(item?.activity_id == 5905 && item?.video != 0){
                                        let getVideo = getAllPostVideo.find((video) => video?.id == item?.video);
                                        if(!item['post']){
                                            item['post'] = Object.create(null);
                                        }
                                        item['post']['id'] = getVideo?.id;
                                        item['post']['title'] = getVideo?.title;
                                    }
                                    if(item?.alt_activity){
                                        let getActivity = getAllAltActivitys.find((act) => act?.id == item?.alt_activity);
                                        if(!item['altactivity']){
                                            item['altactivity'] = Object.create(null);
                                        }
                                        item['altactivity']['id'] = getActivity?.id;
                                        item['altactivity']['activity_name'] = getActivity?.activity_name;
                                    }
                                    if(item?.opentype == 1 || item?.opentype == 2){
                                        let getLink = getAllInternalLink.find((link) => link?.id == item?.openinternal);
                                        if(!item['interlinks']){
                                            item['interlinks'] = Object.create(null);
                                        }
                                        item['interlinks']['id'] = getLink?.id;
                                        item['interlinks']['linktitle'] = getLink?.linktitle;
                                    }
                                    return item;
                                }); 
                            }
                            const getActivitiesData = getActivities.sort((a, b) => {
                                if (a.order_id === 0) return 1;
                                if (b.order_id === 0) return -1;
                                return a.order_id - b.order_id;
                            });
                            rewardDetails['activitys'] = getActivitiesData;
                            let getChallenges: any = await this.campaignChallengeService.listRecord(
                                { campaign_id: postData?.campaign_id, reward_id: reward_id, status: Not(2) },
                                { order_id: 'ASC' },
                                ['campaignchallenge','sc.id','sc.custom_cname','ch.id','ch.challenge_name'],
                                'yes'
                            );
                            getChallenges = <any>(
                                await this.commonArrayService.formatToDto(CampaignChallengeDto, getChallenges, req.lang)
                            );
                            if(getChallenges && getChallenges.length){
                                await Promise.all(getChallenges.map(async (ele)=>{
                                    if(ele['ch'].challenge_name){
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`challenge_name_${ele['ch'].id}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['ch'].id}`,`dynamic`);
                                        if (!customName.includes('challenge_name_')) {
                                            ele['ch'].challenge_name = customName;
                                        }
                                    }
                                    if(ele['ch'] && ele['ch'].challenge_desc){
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`challenge_desc_${ele['ch'].id}`, `/LC_MESSAGES/Challenge/MyChallenges/0/${ele['ch'].id}`,`dynamic`);
                                        if (!customName.includes('challenge_desc_')) {
                                            ele['ch'].challenge_desc = customName;
                                        }
                                    }
                                    if(ele['sc'] && ele['sc'].custom_cname){
                                        let customName = await this.translatorService.frontendReadTranslation(req.lang,`custom_cname_${ele['sc']['id']}`, `/LC_MESSAGES/Challenge/MyChallenges/${postData?.organization_id}/${ele['sc']['id']}`,`dynamic`);
                                        ele['sc'].custom_cname = (customName == '' || customName == `custom_cname_${ele['sc']['id']}`) ? ele['sc']['custom_cname'] : customName;
                                    }
                                }));
                            }
                            const getChallengesData = getChallenges.sort((a, b) => {
                                if (a.order_id === 0) return 1;
                                if (b.order_id === 0) return -1;
                                return a.order_id - b.order_id;
                            });
                            rewardDetails['challenges'] = getChallengesData;
                            let getCategory = await this.campaignCategoryService.listRecord(
                                { campaign_id: postData?.campaign_id, reward_id: reward_id, status: Not(2) },
                                { order_id: 'ASC' },
                                ['campaigncategory', 'category.id', 'category.category_name', 'category.qty_req', 'category.reqby_usr', 'category.reqby_spouse', 'category.max_freto_earn_point', 'category.point_for_each', 'category.max_point_per_cham']
                            );
                            getCategory = <any>(
                                await this.commonArrayService.formatToDto(CampaignCategoryDto, getCategory, req.lang)
                            );
                            const getCategoryData = getCategory.sort((a, b) => {
                                if (a.order_id === 0) return 1;
                                if (b.order_id === 0) return -1;
                                return a.order_id - b.order_id;
                            });
                            rewardDetails['categorys'] = getCategoryData;
                            rewardDatas.push(rewardDetails);
                        /* GET ACTIVITIES */
                    }
                }
            }else{
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: rewardDatas,
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
    @Post('list')
    async list(@Req() req: Request,@Res() res: Response, @Body() postData: any){
        try {
            if (!postData?.campaign_id || !postData?.organization_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const checkCampaign = await this.campaignService.findOne({
                id: postData?.campaign_id, status: Not(2), organization_id: postData?.organization_id
            });
            if (!checkCampaign) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            let where: any = { status: Not(2) };
            if (postData?.campaign_id) {
                where.campaign_id = postData?.campaign_id;
            }
            const order = postData && postData?.order ? postData?.order : 'ASC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'order_id';
            let result = await this.campaignRewardService.listRecord(where, { [orderBy]: order },['id', 'campaign_id', 'reward_name']);
            result = <any>(
                await this.commonArrayService.formatToDto(CampaignRewardDto, result, req.lang)
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
    @Post('create')
    async create(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (
                !postData?.organization_id ||
                !postData?.campaign_id ||
                !postData?.order_id ||
                !postData?.reward_name
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const campaignPlanCheck = await this.campaignService.findOne({
                id: postData?.campaign_id, organization_id: postData?.organization_id, status: Not(2)
            });
            if (!campaignPlanCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            const recordDetails = await this.campaignRewardService.checkReward({
                reward_name: postData?.reward_name,campaign_id: postData?.campaign_id, status: Not(2)
            });
            if (recordDetails) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_CAMPAIGN_REWARD_EXIST'));
            }
            let reward_id = null;
            if(postData?.ins_reward != 1 && postData?.cash_reward != 1 && postData?.other_reward != 1){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REWARD_TYPE_REQUIRED'));
            }else{
                let dynamicData = Object.create(null);
                const insertedRecord = await this.campaignRewardService.save(postData);
                if(Object.keys(insertedRecord)?.length > 0){
                    reward_id = insertedRecord['id'];
                    if(postData?.reward_name){
                        let title = `reward_name_${postData?.campaign_id}_${reward_id}`
                        dynamicData[`${title}`]= postData?.reward_name;
                    }  
                    if(postData?.reward_desc){
                        let title = `reward_desc_${postData?.campaign_id}_${reward_id}`
                        dynamicData[`${title}`]= postData?.reward_desc;
                    }  
                    let updateRewardData:any = Object.create(null);
                    let insIds = [];
                    let cashIds = [];
                    let otherIds = [];
                    if(postData?.ins_reward == 1){
                        let insData = postData?.ins_datas;
                        insData = (insData && insData != '') ? JSON.parse(insData) : '';
                        for(let i = 0; i < insData?.length; i++){
                            let ins_id = insData[i]?.ins_id;
                            let insRewardData = {
                                ins_id: ins_id,
                                reward_id: reward_id,
                                cust_name: insData[i]?.cust_name,
                                order_id: insData[i]?.order_id,
                                point_user: insData[i]?.point_user,
                                point_spouse: insData[i]?.point_spouse,
                                amt_user: insData[i]?.amt_user,
                                amt_spouse: insData[i]?.amt_spouse,
                                max_point_limit: insData[i]?.max_point_limit,
                                consider_require: insData[i]?.consider_require,
                                status: 1
                            }
                            const insertInsId = await this.insuranceRewardService.save(insRewardData);
                            if(Object.keys(insertInsId)?.length > 0){
                                insIds.push(insertInsId.identifiers[0].id);
                            }
                        }
                    }
                    if(postData?.cash_reward == 1){
                        let cashData = postData?.cash_datas;
                        cashData = (cashData && cashData != '') ? JSON.parse(cashData) : '';
                        for(let i = 0; i < cashData?.length; i++){
                            let cashRewardData = {
                                reward_id: reward_id,
                                cust_name: cashData[i]?.cust_name,
                                order_id: cashData[i]?.order_id,
                                point_user: cashData[i]?.point_user,
                                point_spouse: cashData[i]?.point_spouse,
                                amt_user: cashData[i]?.amt_user,
                                amt_spouse: cashData[i]?.amt_spouse,
                                max_point_limit: cashData[i]?.max_point_limit,
                                consider_require: cashData[i]?.consider_require,
                                status: 1
                            }
                            const insertCashId = await this.cashRewardService.save(cashRewardData);
                            if(Object.keys(insertCashId)?.length > 0){
                                cashIds.push(insertCashId.identifiers[0].id);
                                if(cashData[i]?.cust_name){
                                    let title = `cash_reward_name_${reward_id}_${insertCashId.identifiers[0].id}`
                                    dynamicData[`${title}`]= cashData[i]?.cust_name;
                                }
                            }
                        }
                    }
                    if(postData?.other_reward == 1){
                        let otherData = postData?.other_datas;
                        otherData = (otherData && otherData != '') ? JSON.parse(otherData) : '';
                        for(let i = 0; i < otherData?.length; i++){
                            let otherRewardData = {
                                reward_id: reward_id,
                                cust_name: otherData[i]?.cust_name,
                                order_id: otherData[i]?.order_id,
                                point: otherData[i]?.point,
                                max_point_limit: otherData[i]?.max_point_limit,
                                consider_require: otherData[i]?.consider_require,
                                status: 1
                            }
                            const insertOtherId = await this.otherRewardService.save(otherRewardData);
                            if(Object.keys(insertOtherId)?.length > 0){
                                otherIds.push(insertOtherId.identifiers[0].id);
                                if(otherData[i]?.cust_name){
                                    let title = `other_reward_name_${reward_id}_${insertOtherId.identifiers[0].id}`
                                    dynamicData[`${title}`]= otherData[i]?.cust_name;
                                }
                            }
                        }
                    }
                    if(insIds?.length > 0){
                        updateRewardData['ins_ids'] = insIds.join(',');
                    }else{
                        updateRewardData['ins_reward'] = 0;
                        updateRewardData['ins_ids'] = '';
                    }
                    if(cashIds?.length > 0){
                        updateRewardData['cash_ids'] = cashIds.join(',');
                    }else{
                        updateRewardData['cash_reward'] = 0;
                        updateRewardData['cash_ids'] = '';
                    }
                    if(otherIds?.length > 0){
                        updateRewardData['other_ids'] = otherIds.join(',');
                    }else{
                        updateRewardData['other_reward'] = 0;
                        updateRewardData['other_ids'] = '';
                    }
                    await this.campaignRewardService.update(
                        { id: reward_id },
                        {
                            ...updateRewardData,
                        },
                    );
                    /* Reward Data update in english file */
                    let insuranceRewardAll = await this.insuranceRewardService.listRecord({id: In(insIds), status: Not(2)}, '', ['insurancereward.id','insurancereward.cust_name','insurancePlan'],'yes');
                    if(insuranceRewardAll && insuranceRewardAll?.length > 0){
                        for (const key in insuranceRewardAll) {
                            let INId = insuranceRewardAll[key]?.id;
                            let tilteC = `ins_reward_name_${reward_id}_${INId}`;
                            dynamicData[`${tilteC}`] = insuranceRewardAll[key]?.cust_name ? insuranceRewardAll[key]?.cust_name : "";
                            if(dynamicData[`${tilteC}`] == ''){
                                dynamicData[`${tilteC}`]= insuranceRewardAll[key]?.['insurancePlan']?.plan_name;
                            }  
                        }
                    }
                    if(dynamicData && Object.keys(dynamicData)?.length > 0){
                        await this.translatorService.DynamicEngJsonData('Campaign',postData?.organization_id,dynamicData,'Edit','Campaigns',postData?.campaign_id);
                    }
                    /* Reward Data update in english file */
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_SOMETHING_WENT_WRONG'));
                }
            }
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: { campaign_id: postData?.campaign_id, reward_id: reward_id, organization_id: postData?.organization_id },
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
    @Put('update')
    async update(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (
                !postData?.organization_id ||
                !postData?.campaign_id ||
                !postData?.order_id ||
                !postData?.reward_name ||
                !postData?.id
            ) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }
            const campaignPlanCheck = await this.campaignService.findOne({
                id: postData?.campaign_id, organization_id: postData?.organization_id, status: Not(2)
            });
            if (!campaignPlanCheck) {
                throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_RECORD_NOT_FOUND"));
            }
            if (postData?.reward_name) {
                const recordDetails = await this.campaignRewardService.checkReward({
                    id: Not(postData?.id), reward_name: postData?.reward_name,campaign_id: postData?.campaign_id, status: Not(2)
                });
                if (recordDetails) {
                    throw Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_CAMPAIGN_REWARD_EXIST"));
                }
            }
            let reward_id = postData?.id;
            if(postData?.ins_reward != 1 && postData?.cash_reward != 1 && postData?.other_reward != 1){
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_REWARD_TYPE_REQUIRED'));
            }else{
                let RewardData = {
                    campaign_id: postData?.campaign_id,
                    order_id: postData?.order_id,
                    reward_name: postData?.reward_name,
                    reward_desc: postData?.reward_desc,
                    ins_reward: postData?.ins_reward,
                    cash_reward: postData?.cash_reward,
                    other_reward: postData?.other_reward,
                    hire_date: postData?.hire_date,
                    cat_activity_visibility: postData?.cat_activity_visibility,
                    user_eligible: postData?.user_eligible,
                    is_display_status: postData?.is_display_status,
                    eligibility: postData?.eligibility,
                    org_tab_setting: postData?.org_tab_setting,
                }
                const updateRewardData = await this.campaignRewardService.update(
                    { id: postData?.id },
                    {
                      ...RewardData,
                    },
                );
                if(updateRewardData?.affected > 0){
                    let dynamicData = Object.create(null);
                    if(postData?.reward_name){
                        let title = `reward_name_${postData?.campaign_id}_${reward_id}`
                        dynamicData[`${title}`]= postData?.reward_name;
                    }  
                    if(postData?.reward_desc){
                        let title = `reward_desc_${postData?.campaign_id}_${reward_id}`
                        dynamicData[`${title}`]= postData?.reward_desc;
                    }  
                    const where = { id: postData?.id, campaign_id: postData?.campaign_id, status: Not(2)};
                    let getRewardDetails = await this.campaignRewardService.getOne(where,['campaignreward','insurance','cash','other'],'full');
                    const insuranceEIds = getRewardDetails['insurance']?.map((insurance: any) => insurance.id) || [];
                    const cashEIds = getRewardDetails['cash']?.map((cash: any) => cash.id) || [];
                    const otherEIds = getRewardDetails['other']?.map((other: any) => other.id) || [];
                    let newUpdateRewardData:any = Object.create(null);
                    let insIds = [];
                    let cashIds = [];
                    let otherIds = [];
                    let insUpdatedIds = [];
                    let cashUpdatedIds = [];
                    let othUpdatedIds = [];
                    if(postData?.ins_reward == 1){
                        let insData = postData?.ins_datas;
                        insData = (insData && insData != '') ? JSON.parse(insData) : '';
                        for(let i = 0; i < insData?.length; i++){
                            let ins_id = insData[i]?.ins_id;
                            if(insData[i]?.id){
                                insUpdatedIds = [...insUpdatedIds, insData[i]?.id];
                                let upRewardData = {
                                    ins_id: ins_id,
                                    reward_id: reward_id,
                                    cust_name: insData[i]?.cust_name,
                                    order_id: insData[i]?.order_id,
                                    point_user: insData[i]?.point_user,
                                    point_spouse: insData[i]?.point_spouse,
                                    amt_user: insData[i]?.amt_user,
                                    amt_spouse: insData[i]?.amt_spouse,
                                    max_point_limit: insData[i]?.max_point_limit,
                                    consider_require: insData[i]?.consider_require,
                                }
                                await this.insuranceRewardService.update(
                                    { id: insData[i]?.id },
                                    {
                                        ...upRewardData,
                                    },
                                );
                            }else{
                                let insRewardData = {
                                    ins_id: ins_id,
                                    reward_id: reward_id,
                                    cust_name: insData[i]?.cust_name,
                                    order_id: insData[i]?.order_id,
                                    point_user: insData[i]?.point_user,
                                    point_spouse: insData[i]?.point_spouse,
                                    amt_user: insData[i]?.amt_user,
                                    amt_spouse: insData[i]?.amt_spouse,
                                    max_point_limit: insData[i]?.max_point_limit,
                                    consider_require: insData[i]?.consider_require,
                                    status: 1
                                }
                                const insertInsId = await this.insuranceRewardService.save(insRewardData);
                                if(Object.keys(insertInsId)?.length > 0){
                                    insIds.push(insertInsId.identifiers[0].id);
                                }
                            }
                        }
                    }
                    if(postData?.cash_reward == 1){
                        let cashData = postData?.cash_datas;
                        cashData = (cashData && cashData != '') ? JSON.parse(cashData) : '';
                        for(let i = 0; i < cashData?.length; i++){
                            if(cashData[i]?.id){
                                cashUpdatedIds = [...cashUpdatedIds, cashData[i]?.id];
                                let upRewardData = {
                                    reward_id: reward_id,
                                    cust_name: cashData[i]?.cust_name,
                                    order_id: cashData[i]?.order_id,
                                    point_user: cashData[i]?.point_user,
                                    point_spouse: cashData[i]?.point_spouse,
                                    amt_user: cashData[i]?.amt_user,
                                    amt_spouse: cashData[i]?.amt_spouse,
                                    max_point_limit: cashData[i]?.max_point_limit,
                                    consider_require: cashData[i]?.consider_require,
                                }
                                if(cashData[i]?.cust_name){
                                    let title = `cash_reward_name_${reward_id}_${cashData[i].id}`
                                    dynamicData[`${title}`]= cashData[i]?.cust_name;
                                }
                                await this.cashRewardService.update(
                                    { id: cashData[i]?.id },
                                    {
                                        ...upRewardData,
                                    },
                                );
                            }else{
                                let insRewardData = {
                                    reward_id: reward_id,
                                    cust_name: cashData[i]?.cust_name,
                                    order_id: cashData[i]?.order_id,
                                    point_user: cashData[i]?.point_user,
                                    point_spouse: cashData[i]?.point_spouse,
                                    amt_user: cashData[i]?.amt_user,
                                    amt_spouse: cashData[i]?.amt_spouse,
                                    max_point_limit: cashData[i]?.max_point_limit,
                                    consider_require: cashData[i]?.consider_require,
                                    status: 1
                                }
                                const insertCashId = await this.cashRewardService.save(insRewardData);
                                if(Object.keys(insertCashId)?.length > 0){
                                    cashIds.push(insertCashId.identifiers[0].id);
                                    if(cashData[i]?.cust_name){
                                        let title = `cash_reward_name_${reward_id}_${insertCashId.identifiers[0].id}`
                                        dynamicData[`${title}`]= cashData[i]?.cust_name;
                                    }
                                }
                            }
                        }
                    }
                    if(postData?.other_reward == 1){
                        let otherData = postData?.other_datas;
                        otherData = (otherData && otherData != '') ? JSON.parse(otherData) : '';
                        for(let i = 0; i < otherData?.length; i++){
                            if(otherData[i]?.id){
                                othUpdatedIds = [...othUpdatedIds, otherData[i]?.id];
                                let upRewardData = {
                                    reward_id: reward_id,
                                    cust_name: otherData[i]?.cust_name,
                                    order_id: otherData[i]?.order_id,
                                    point: otherData[i]?.point,
                                    max_point_limit: otherData[i]?.max_point_limit,
                                    consider_require: otherData[i]?.consider_require,
                                }
                                if(otherData[i]?.cust_name){
                                    let title = `other_reward_name_${reward_id}_${otherData[i]?.id}`
                                    dynamicData[`${title}`]= otherData[i]?.cust_name;
                                }
                                await this.otherRewardService.update(
                                    { id: otherData[i]?.id },
                                    {
                                        ...upRewardData,
                                    },
                                );
                            }else{
                                let insRewardData = {
                                    reward_id: reward_id,
                                    cust_name: otherData[i]?.cust_name,
                                    order_id: otherData[i]?.order_id,
                                    point: otherData[i]?.point,
                                    max_point_limit: otherData[i]?.max_point_limit,
                                    consider_require: otherData[i]?.consider_require,
                                    status: 1
                                }
                                const insertOtherId = await this.otherRewardService.save(insRewardData);
                                if(Object.keys(insertOtherId)?.length > 0){
                                    otherIds.push(insertOtherId.identifiers[0].id);
                                    if(otherData[i]?.cust_name){
                                        let title = `other_reward_name_${reward_id}_${insertOtherId.identifiers[0].id}`
                                        dynamicData[`${title}`]= otherData[i]?.cust_name;
                                    }
                                }
                            }
                        }
                    }
                    const insRewardDeletedIds = insuranceEIds.filter(id => !insUpdatedIds.includes(id));
                    if(insRewardDeletedIds.length > 0){
                        for(let i = 0; i < insRewardDeletedIds?.length; i++){
                            await this.insuranceRewardService.update(
                                { id: insRewardDeletedIds[i] },
                                {
                                    status: 2,
                                },
                            );
                            this.activityLogService.create({id: insRewardDeletedIds[i], status: 1}, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_INSURANCE_REWARD, req.tokenUser?.id, 'delete insurance reward');
                        }
                    }
                    const cachRewardDeletedIds = cashEIds.filter(id => !cashUpdatedIds.includes(id));
                    if(cachRewardDeletedIds.length > 0){
                        for(let i = 0; i < cachRewardDeletedIds?.length; i++){
                            await this.cashRewardService.update(
                                { id: cachRewardDeletedIds[i] },
                                {
                                    status: 2,
                                },
                            );
                            this.activityLogService.create({id: cachRewardDeletedIds[i], status: 1}, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CASH_REWARD, req.tokenUser?.id, 'delete cash reward');
                        }
                    }
                    const otherRewardDeletedIds = otherEIds.filter(id => !othUpdatedIds.includes(id));
                    if(otherRewardDeletedIds.length > 0){
                        for(let i = 0; i < otherRewardDeletedIds?.length; i++){
                            await this.otherRewardService.update(
                                { id: otherRewardDeletedIds[i] },
                                {
                                    status: 2,
                                },
                            );
                            this.activityLogService.create({id: otherRewardDeletedIds[i], status: 1}, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_OTHER_REWARD, req.tokenUser?.id, 'delete other reward');
                        }
                    }
                    let newInsIds = insIds.concat(insUpdatedIds);
                    let newCashIds = cashIds.concat(cashUpdatedIds);
                    let newOtherIds = otherIds.concat(othUpdatedIds);
                    if(newInsIds?.length > 0){
                        newUpdateRewardData['ins_ids'] = newInsIds.join(',');
                    }else{
                        newUpdateRewardData['ins_reward'] = 0;
                        newUpdateRewardData['ins_ids'] = '';
                    }
                    if(newCashIds?.length > 0){
                        newUpdateRewardData['cash_ids'] = newCashIds.join(',');
                    }else{
                        newUpdateRewardData['cash_reward'] = 0;
                        newUpdateRewardData['cash_ids'] = '';
                    }
                    if(newOtherIds?.length > 0){
                        newUpdateRewardData['other_ids'] = newOtherIds.join(',');
                    }else{
                        newUpdateRewardData['other_reward'] = 0;
                        newUpdateRewardData['other_ids'] = '';
                    }
                    await this.campaignRewardService.update(
                        { id: reward_id },
                        {
                            ...newUpdateRewardData,
                        },
                    );
                    /* Reward Data update in english file */
                    let insuranceRewardAll = await this.insuranceRewardService.listRecord({id: In(newInsIds), status: Not(2)}, '', ['insurancereward.id','insurancereward.cust_name','insurancePlan'],'yes');
                    if(insuranceRewardAll && insuranceRewardAll?.length > 0){
                        for (const key in insuranceRewardAll) {
                            let INId = insuranceRewardAll[key]?.id;
                            let tilteC = `ins_reward_name_${reward_id}_${INId}`;
                            dynamicData[`${tilteC}`] = insuranceRewardAll[key]?.cust_name ? insuranceRewardAll[key]?.cust_name : "";
                            if(dynamicData[`${tilteC}`] == ''){
                                dynamicData[`${tilteC}`]= insuranceRewardAll[key]?.['insurancePlan']?.plan_name;
                            }  
                        }
                    }
                    if(dynamicData && Object.keys(dynamicData)?.length > 0){
                        await this.translatorService.DynamicEngJsonData('Campaign',postData?.organization_id,dynamicData,'Edit','Campaigns',postData?.campaign_id);
                    }
                    /* Reward Data update in english file */
                }else{
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, 'ERR_SOMETHING_WENT_WRONG'));
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: { campaign_id: postData?.campaign_id, reward_id: reward_id, organization_id: postData?.organization_id },
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
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.campaign_id || !postData?.reward_id || !postData?.organization_id) {
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
            let checkReward = await this.campaignRewardService.checkReward({
                id: postData?.reward_id, campaign_id: postData?.campaign_id, status: Not(2)
            });
            if (!checkReward) {
                let errorMessage = await this.translatorService.frontendReadTranslation(req.lang, "ERR_RECORD_NOT_FOUND");
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: errorMessage,
                });
            }
             /* Delete Reward */
            await this.campaignRewardService.update({ id: postData?.reward_id, campaign_id: postData?.campaign_id },{ status: 2 });
            const campaignRewards = await this.campaignRewardService.listRecord({id: postData?.reward_id, campaign_id: postData?.campaign_id, status: Not(2)});
            campaignRewards?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_CAMPAIGN_ACTIVITY, req.tokenUser?.id, 'delete campaign reward'));
            /* Delete Activity */
            await this.campaignActivityService.update({ campaign_id: postData?.campaign_id, reward_id: postData?.reward_id},{ status: 2 });
            const campaignActivitys = await this.campaignActivityService.loglistRecord({campaign_id: postData?.campaign_id, reward_id: postData?.reward_id, status: Not(2)});
            campaignActivitys?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_CAMPAIGN_ACTIVITY, req.tokenUser?.id, 'delete campaign activitys'));
            /* Delete Campagin Challenge */
            await this.campaignChallengeService.update({ campaign_id: postData?.campaign_id , reward_id: postData?.reward_id},{ status: 2 });
            const campaignChallenges = await this.campaignChallengeService.listRecord({campaign_id: postData?.campaign_id, reward_id: postData?.reward_id, status: Not(2)});
            campaignChallenges?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete campaign challenge'));
            /* Delete Campagin Categorys */
            await this.campaignCategoryService.update({ campaign_id: postData?.campaign_id , reward_id: postData?.reward_id},{ status: 2 });
            const campaignCategory = await this.campaignCategoryService.loglistRecord({campaign_id: postData?.campaign_id, reward_id: postData?.reward_id, status: Not(2)});
            campaignCategory?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete campaign category'));
             /* Delete Insurance Reward */
             await this.insuranceRewardService.update({ reward_id: postData?.reward_id},{ status: 2 });
             const insuranceReward = await this.insuranceRewardService.listRecord({reward_id: postData?.reward_id, status: Not(2)});
             insuranceReward?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete campaign insurance reward'));
              /* Delete Cash Reward */
            await this.cashRewardService.update({ reward_id: postData?.reward_id},{ status: 2 });
            const CashReward = await this.cashRewardService.listRecord({reward_id: postData?.reward_id, status: Not(2)});
            CashReward?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete campaign cash reward'));
             /* Delete Other Reward */
             await this.otherRewardService.update({ reward_id: postData?.reward_id},{ status: 2 });
             const otherReward = await this.otherRewardService.listRecord({reward_id: postData?.reward_id, status: Not(2)});
             otherReward?.map(ele=>this.activityLogService.create(ele, {status: 2}, tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_CHALLENGE, req.tokenUser?.id, 'delete campaign other reward'));
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
