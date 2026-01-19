import { appConstant, CampaignActivityEntity, CampaignCategoryEntity, CampaignChallengeEntity, CampaignEntity, CampaignRewardEntity, CashRewardEntity, InsuranceRewardEntity, OtherRewardEntity, tableConstant, UserEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FrontPointsForService } from './front/frontpointfor.service';
@Injectable()
export class CampaignDashboardService {
    constructor(
        @InjectRepository(CampaignEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacampaignRepository: Repository<CampaignEntity>,
        @InjectRepository(CampaignRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacampaignRewardRepository: Repository<CampaignRewardEntity>,
        @InjectRepository(CampaignActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignActivityRepository: Repository<CampaignActivityEntity>,
        @InjectRepository(CampaignChallengeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignChallengeRepository: Repository<CampaignChallengeEntity>,
        @InjectRepository(CampaignCategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignCategoryRepository: Repository<CampaignCategoryEntity>,
        @InjectRepository(InsuranceRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaInsuranceRewardRepository: Repository<InsuranceRewardEntity>,
        @InjectRepository(CashRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCashRewardRepository: Repository<CashRewardEntity>,
        @InjectRepository(OtherRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaOtherRewardRepository: Repository<OtherRewardEntity>,
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectDataSource(appConstant.READ_REPLICA.toLowerCase()) 
        private readonly dataSource: DataSource,
        private readonly frontPointsForService: FrontPointsForService,
    ) {}
    async getDynamicRepository(entity: string | Function): Promise<Repository<any>> {
        return this.dataSource.getRepository(entity);
    }
    async findOne(condition: any) {
        return await this.readReplicacampaignRepository.createQueryBuilder('campaign')
            .where(condition)
            .getOne();
    }
    async getRewardsData(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacampaignRewardRepository.createQueryBuilder('reward')
            .where(condition)
            .orderBy(`reward.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async rewardItemGetDetails(type:any = 'all', rewardData:any = []) {
        try{
            let query = {};
            if(type == 'related_activity'){
                let activityIds = rewardData['related_activity'];
                let condition = `campaignactivity.id IN (${activityIds}) and campaignactivity.status = 1`;
                if(rewardData['year']){
                    let startDate = `${rewardData['year']}-01-01 00:00:00`;
                    let endDate = `${rewardData['year']}-12-31 23:59:59`;
                    condition += ` AND((campaignactivity.start_date BETWEEN '${startDate}' AND '${endDate}') OR (campaignactivity.end_date BETWEEN '${startDate}' AND '${endDate}'))`;
                }
                let query = this.readReplicaCampaignActivityRepository.createQueryBuilder('campaignactivity')
                .leftJoinAndMapOne(
                    'campaignactivity.activity',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'activity',
                    `activity.id = campaignactivity.activity_id AND activity.status = 1`,
                )
                .leftJoinAndMapOne(
                    'campaignactivity.category',
                    tableConstant.ACTIVITIES.TBL_CATEGORIES,
                    'category',
                    `category.id = activity.category_id AND category.status = 1`,
                );
                query = query.where(condition)
                .orderBy('campaignactivity.order_id', 'ASC')
                .addOrderBy('campaignactivity.required_by_spouse', 'DESC')
                .addOrderBy('campaignactivity.required_by_user', 'DESC')
                .addOrderBy('campaignactivity.end_date', 'ASC')
                .addOrderBy('campaignactivity.cust_name', 'ASC')
                .addOrderBy('activity.activity_name', 'ASC');
                return await query.getMany();
            }else if(type == 'related_challenge'){
                let challengeIds = rewardData['related_challenge'];
                let condition = `campaignchallenge.id IN (${challengeIds}) and campaignchallenge.status = 1`;
                let query = this.readReplicaCampaignChallengeRepository.createQueryBuilder('campaignchallenge')
                .leftJoinAndMapOne(
                    'campaignchallenge.sc',
                    tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                    'sc',
                    `sc.id = campaignchallenge.challenge_schedule_id AND sc.status = 1`,
                )
                .leftJoinAndMapOne(
                    'campaignchallenge.ch',
                    tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                    'ch',
                    `ch.id = campaignchallenge.challenge_id AND ch.status = 1`,
                );
                query = query.where(condition);
                return await query.getMany();
            }else if(type == 'related_category'){
                let categoryId = rewardData['related_category'];
                let condition = `campaigncategory.id IN (${categoryId}) and campaigncategory.status = 1`;
                let query = this.readReplicaCampaignCategoryRepository.createQueryBuilder('campaigncategory')
                .leftJoinAndMapOne(
                    'campaigncategory.category',
                    tableConstant.ACTIVITIES.TBL_CATEGORIES,
                    'category',
                    `category.id = campaigncategory.category_id AND category.status = 1`,
                );
                query = query.where(condition);
                return await query.getMany();
            }else if(type == 'insurance_reward'){
                let insRewardId = rewardData['ins_ids'];
                let condition = `insurancereward.id IN (${insRewardId}) and insurancereward.status = 1`;
                let query = this.readReplicaInsuranceRewardRepository.createQueryBuilder('insurancereward')
                .leftJoinAndMapOne(
                    'insurancereward.insuranceplan',
                    tableConstant.CAMPAIGN.TBL_INSURANCE_PLAN,
                    'insuranceplan',
                    `insuranceplan.id = insurancereward.ins_id AND insuranceplan.status = 1`,
                );
                query = query.where(condition)
                .orderBy('insurancereward.order_id', 'ASC')
                return await query.getMany();
            }else if(type == 'cash_reward'){
                let cashRewardId = rewardData['cash_ids'];
                let condition = `cashreward.id IN (${cashRewardId}) and cashreward.status = 1`;
                return await this.readReplicaCashRewardRepository.createQueryBuilder('cashreward')
                .where(condition)
                .orderBy('cashreward.order_id', 'ASC')
                .getMany();
            }else if(type == 'other_reward'){
                let otherRewardId = rewardData['other_ids'];
                let condition = `otherreward.id IN (${otherRewardId}) and otherreward.status = 1`;
                return await this.readReplicaOtherRewardRepository.createQueryBuilder('otherreward')
                .where(condition)
                .orderBy('otherreward.order_id', 'ASC')
                .getMany();
            }else if(type == 'campaign_activity'){
                let condition = rewardData;
                let query = this.readReplicaCampaignActivityRepository.createQueryBuilder('campaignactivity')
                .leftJoinAndMapOne(
                    'campaignactivity.activity',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'activity',
                    `activity.id = campaignactivity.activity_id AND activity.status = 1`,
                )
                .leftJoinAndMapOne(
                    'campaignactivity.category',
                    tableConstant.ACTIVITIES.TBL_CATEGORIES,
                    'category',
                    `category.id = activity.category_id AND category.status = 1`,
                );
                query = query.where(condition)
                .orderBy('campaignactivity.order_id', 'ASC')
                .addOrderBy('campaignactivity.required_by_spouse', 'DESC')
                .addOrderBy('campaignactivity.required_by_user', 'DESC')
                .addOrderBy('campaignactivity.cust_name', 'ASC')
                .addOrderBy('activity.activity_name', 'ASC');
                return await query.getMany();
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async getMultiRewarddatas(call_from:any = '', rewards:any = [], otherDatas:any = []) {
        try{
                let {
                    activePlugins = [],
                    company_id = '',
                    dateRange = 0,
                    membershipCode = '',
                    otherCondition = '',
                    statusCondition = '',
                    filterStartDate = '',
                    filterEndDate = '',
                    campaignId = '',
                    wellnesschampion = '',
                    slider = {},
                    allUsersDOHInfoData = {},
                    campaigns
                } = Object.assign({}, ...otherDatas);
            let myHireData = {};
            for (let element of rewards) {
                const rewardId = element['id'];
                const isDefaultReward = element?.['isDefaultReward'] || 0;
                const hireDateCount = element?.['hire_date_count'] || 0;
                myHireData = {
                    'hireDateSetting' : element['hire_date'],
                    'hireDateCount' : hireDateCount,
                    'allUsersDOHInfoData' : allUsersDOHInfoData
                };
                let category:any = [];
                element['CampaignId'] = campaignId;
                if (element['related_category'] != "") {
                    category = await this.rewardItemGetDetails('related_category', element);
                }
                let hireDate:any = '';
                if (element['hire_date'] == 1) {
                    let totaldays = 0;
                    hireDate = await this.getMaxHireDate(membershipCode);
                }
                let uType_condition = ` AND user.role_id IN (2,16)`;
                if(campaigns?.length){
                    element['year'] = campaigns.find(camp => camp.id == element['campaign_id'])?.year || null;
                }
                if(isDefaultReward == 1){
                    let activity = element?.['activitys'] || [];
                    let actOtherData = [ {  'dateCalType' : 'activity' }, { 'membershipCode' : membershipCode }, { 'category' : category }, { 'otherCondition' : otherCondition }, { 'company_id' : company_id }, { 'campaignId' : campaignId }, { 'rewardId' : rewardId }, { 'hireDate' : hireDate },{ 'myHireData' : myHireData }, { 'activePlugins' : activePlugins }, { 'uType_condition' : uType_condition }, { 'statusCondition' : statusCondition }, { 'wellnesschampion' : wellnesschampion }, { 'dateRange' : dateRange }, { 'filterStartDate' : filterStartDate }, { 'filterEndDate' : filterEndDate }, {year: element['year']}];
                    const returnArray = await this.frontPointsForService.points_for_activities_report(call_from, activity, actOtherData); 
                    activity = JSON.parse(JSON.stringify(returnArray['activity']));
                    element['Campaignactivity'] = JSON.parse(JSON.stringify(activity));
                }else{
                    if (element['related_activity'] != "") {
                        let activity = await this.rewardItemGetDetails('related_activity', element);
                        let actOtherData = [ {  'dateCalType' : 'activity' }, { 'membershipCode' : membershipCode }, { 'category' : category }, { 'otherCondition' : otherCondition }, { 'company_id' : company_id }, { 'campaignId' : campaignId }, { 'rewardId' : rewardId }, { 'hireDate' : hireDate },{ 'myHireData' : myHireData }, { 'activePlugins' : activePlugins }, { 'uType_condition' : uType_condition }, { 'statusCondition' : statusCondition }, { 'wellnesschampion' : wellnesschampion }, { 'dateRange' : dateRange }, { 'filterStartDate' : filterStartDate }, { 'filterEndDate' : filterEndDate }, {year: element['year']}];
                        const returnArray = await this.frontPointsForService.points_for_activities_report(call_from, activity, actOtherData); 
                        activity = JSON.parse(JSON.stringify(returnArray['activity']));
                        category = JSON.parse(JSON.stringify(returnArray['category']));
                        element['Campaignactivity'] = JSON.parse(JSON.stringify(activity));
                        element['RequiredCampaignactivityUser'] = returnArray['requiredCampActivityUser'] || 0;
                        element['RequiredCampaignactivitySpouse'] = returnArray['requiredCampActivitySpouse'] || 0;
                    }
                }
                if(isDefaultReward != 1){
                    if (element['related_challenge'] != "") {
                        let challenges = await this.rewardItemGetDetails('related_challenge', element);
                        if(!element['Campaignchallenges']){
                            element['Campaignchallenges'] = [];
                        }
                        if(!element['CampaignSpousechallenges']){
                            element['CampaignSpousechallenges'] = [];
                        }
                        let Spousechallenges = [];    
                        element['Campaignchallenges'] = JSON.parse(JSON.stringify(challenges));
                        element['CampaignSpousechallenges'] = Spousechallenges;
                    }
                    if(category){
                        let catOtherData = [ { 'dateCalType' : 'category' }, { 'membershipCode' : membershipCode }, { 'otherCondition' : otherCondition }, { 'statusCondition' : statusCondition }, { 'company_id' : company_id }, { 'campaignId' : campaignId }, { 'rewardId' : rewardId }, { 'hireDate' : hireDate }, { 'myHireData' : myHireData },{ 'activePlugins' : activePlugins }, { 'uType_condition' : uType_condition }, { 'challenges' : element['Campaignchallenges'] }];
                        const returnArrayC = await this.frontPointsForService.point_for_category_report(call_from, category, catOtherData);
                        category = JSON.parse(JSON.stringify(returnArrayC['categorys']));
                        element['Campaigncategory'] = JSON.parse(JSON.stringify(category));
                    }
                    if(element['ins_reward'] == 1){
                        let insRewardData = await this.rewardItemGetDetails('insurance_reward', element);
                        let newInsRewardArray = {};
                        for (let insData of insRewardData) {
                            let insRewardId = insData['id'];
                            let insRewardIdStr = 'I'+insData['id'];
                            let transName = '';
                            if(insData['cust_name'] && insData['cust_name'] != ''){
                                transName = insData['cust_name'];
                            }else{
                                transName = insData['insuranceplan']['plan_name'];
                            }
                            if(!newInsRewardArray[insRewardIdStr]){
                                newInsRewardArray[insRewardIdStr] = {};
                            }
                            newInsRewardArray[insRewardIdStr]['id'] = insRewardId;
                            newInsRewardArray[insRewardIdStr]['name'] = transName;
                            newInsRewardArray[insRewardIdStr]['order_id'] = (typeof insData['order_id'] === 'string') ? parseInt(insData['order_id']) : insData['order_id'];
                            newInsRewardArray[insRewardIdStr]['reward_id'] = (typeof insData['reward_id'] === 'string') ? parseInt(insData['reward_id']) : insData['reward_id'];
                            newInsRewardArray[insRewardIdStr]['max_point_limit'] = (typeof insData['max_point_limit'] === 'string') ? parseFloat(insData['max_point_limit']) : insData['max_point_limit'];
                            newInsRewardArray[insRewardIdStr]['consider_require'] = (typeof insData['consider_require'] === 'string') ? parseInt(insData['consider_require']) : insData['consider_require'];
                            newInsRewardArray[insRewardIdStr]['point_user'] = (isNaN(insData['point_user']) || insData['point_user'] == '') ? 0 : ((typeof insData['point_user'] === 'string') ? parseFloat(insData['point_user']) : insData['point_user']);
                            newInsRewardArray[insRewardIdStr]['point_spouse'] =  (isNaN(insData['point_spouse']) || insData['point_spouse'] == '') ? 0 : ((typeof insData['point_spouse'] === 'string') ? parseFloat(insData['point_spouse']) : insData['point_spouse']);
                            if (newInsRewardArray[insRewardIdStr]['point_spouse'] == 0) {
                                newInsRewardArray[insRewardIdStr]['point_spouse'] = (isNaN(insData['point_user']) || insData['point_user'] == '') ? 0 : ((typeof insData['point_user'] === 'string') ? parseFloat(insData['point_user']) : insData['point_user']);
                            }
                            newInsRewardArray[insRewardIdStr]['amt_user'] = (isNaN(insData['amt_user']) || insData['amt_user'] == '') ? 0 : ((typeof insData['amt_user'] === 'string') ? parseFloat(insData['amt_user']) : insData['amt_user']);
                            newInsRewardArray[insRewardIdStr]['amt_spouse'] = (isNaN(insData['amt_spouse']) || insData['amt_spouse'] == '') ? 0 : ((typeof insData['amt_spouse'] === 'string') ? parseFloat(insData['amt_spouse']) : insData['amt_spouse']);
                        }
                        element['InsReward'] = Object.values(newInsRewardArray);
                    }else{
                        element['InsReward'] = [];
                    }
                    if(element['cash_reward'] == 1){
                        let cashRewardData = await this.rewardItemGetDetails('cash_reward', element);
                        let newCashRewardArray = {};
                        for (let cashData of cashRewardData) {
                            let cashRewardId = cashData['id'];
                            let cashRewardIdStr = 'C'+cashData['id'];
                            let transName = '';
                            if(cashData['cust_name'] && cashData['cust_name'] != ''){
                                transName = cashData['cust_name'];
                            }else{
                                transName = 'Cash';
                            }
                            if(!newCashRewardArray[cashRewardIdStr]){
                                newCashRewardArray[cashRewardIdStr] = {};
                            }
                            newCashRewardArray[cashRewardIdStr]['id'] = cashRewardId;
                            newCashRewardArray[cashRewardIdStr]['name'] = transName;
                            newCashRewardArray[cashRewardIdStr]['order_id'] = cashData['order_id'];
                            newCashRewardArray[cashRewardIdStr]['reward_id'] = cashData['reward_id'];
                            newCashRewardArray[cashRewardIdStr]['max_point_limit'] = (typeof cashData['max_point_limit'] === 'string') ? parseFloat(cashData['max_point_limit']) : cashData['max_point_limit'];
                            newCashRewardArray[cashRewardIdStr]['consider_require'] = (typeof cashData['consider_require'] === 'string') ? parseInt(cashData['consider_require']) : cashData['consider_require'];
                            newCashRewardArray[cashRewardIdStr]['point_user'] = (isNaN(cashData['point_user']) || cashData['point_user'] == '') ? 0 : ((typeof cashData['point_user'] === 'string') ? parseFloat(cashData['point_user']) : cashData['point_user']);
                            newCashRewardArray[cashRewardIdStr]['point_spouse'] = (isNaN(cashData['point_spouse']) || cashData['point_spouse'] == '') ? 0 : ((typeof cashData['point_spouse'] === 'string') ? parseFloat(cashData['point_spouse']) : cashData['point_spouse']);
                            if (newCashRewardArray[cashRewardIdStr]['point_spouse'] == 0) {
                                newCashRewardArray[cashRewardIdStr]['point_spouse'] = (isNaN(cashData['point_user']) || cashData['point_user'] == '') ? 0 : ((typeof cashData['point_user'] === 'string') ? parseFloat(cashData['point_user']) : cashData['point_user']);
                            }
                            newCashRewardArray[cashRewardIdStr]['amt_user'] = (isNaN(cashData['amt_user']) || cashData['amt_user'] == '') ? 0 : ((typeof cashData['amt_user'] === 'string') ? parseFloat(cashData['amt_user']) : cashData['amt_user']);
                            newCashRewardArray[cashRewardIdStr]['amt_spouse'] = (isNaN(cashData['amt_spouse']) || cashData['amt_spouse'] == '') ? 0 : ((typeof cashData['amt_spouse'] === 'string') ? parseFloat(cashData['amt_spouse']) : cashData['amt_spouse']);
                        }
                        element['cashReward'] = Object.values(newCashRewardArray);
                    }else{
                        element['cashReward'] = [];
                    }
                    if(element['other_reward'] == 1){
                        let otherRewardData = await this.rewardItemGetDetails('other_reward', element);
                        let newOtherRewardArray = {};
                        for (let otherData of otherRewardData) {
                            let otherRewardId = otherData['id'];
                            let otherRewardIdStr = 'O'+otherData['id'];
                            let transName = '';
                            if(otherData['cust_name'] && otherData['cust_name'] != ''){
                                transName =  otherData['cust_name'];
                            }else{
                                transName = 'Other';
                            }
                            if(!newOtherRewardArray[otherRewardIdStr]){
                                newOtherRewardArray[otherRewardIdStr] = {};
                            }
                            newOtherRewardArray[otherRewardIdStr]['id'] = otherRewardId;
                            newOtherRewardArray[otherRewardIdStr]['name'] = transName;
                            newOtherRewardArray[otherRewardIdStr]['order_id'] = otherData['order_id'];
                            newOtherRewardArray[otherRewardIdStr]['reward_id'] = otherData['reward_id'];
                            newOtherRewardArray[otherRewardIdStr]['max_point_limit'] = (typeof otherData['max_point_limit'] === 'string') ? parseFloat(otherData['max_point_limit']) : otherData['max_point_limit'];
                            newOtherRewardArray[otherRewardIdStr]['consider_require'] = (typeof otherData['consider_require'] === 'string') ? parseInt(otherData['consider_require']) : otherData['consider_require'];
                            newOtherRewardArray[otherRewardIdStr]['point'] = (typeof otherData['point'] === 'string') ? parseFloat(otherData['point']) : otherData['point'];
                        }
                        element['otherReward'] = Object.values(newOtherRewardArray);
                    }else{
                        element['otherReward'] = [];
                    }
                }else{
                    element['Campaignchallenges'] = [];
                    element['CampaignSpousechallenges'] = [];
                    element['Campaigncategory'] = [];
                    element['InsReward'] = [];
                    element['cashReward'] = [];
                    element['otherReward'] = [];
                }
            }
            return rewards;
        }catch (error) {
            throw new Error(error.message);
        }
    }
    async getMaxHireDate(membershipCode:any = ''){
        try{
            const result = await this.readReplicaUserRepository.createQueryBuilder('user')
            .select('MAX(user.date_of_hire)', 'max_date')
            .where('user.membership_code = :membershipCode', { membershipCode })
            .andWhere('user.role_id IN (:...roleIds)', { roleIds: [2, 16] })
            .andWhere('user.date_of_hire IS NOT NULL')
            .getRawOne<{ max_date: string }>();
            return result?.max_date || null; 
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async getAllUsers(condition:any = '', fields:any = [], joinTale: any = []){
        try{
            let query = this.readReplicaUserRepository.createQueryBuilder('user');
            if(joinTale && joinTale.length > 0){
                for(let i = 0; i < joinTale.length; i++){
                    if(joinTale[i].type == 'INNER'){
                        query = query.innerJoinAndMapOne(
                            `${joinTale[i].connect}.${joinTale[i].alias}`,
                            joinTale[i].table,
                            joinTale[i].alias,
                            joinTale[i].on,
                        );
                    }else{
                        query = query.leftJoinAndMapOne(
                            `${joinTale[i].connect}.${joinTale[i].alias}`,
                            joinTale[i].table,
                            joinTale[i].alias,
                            joinTale[i].on,
                        );
                    }
                }
            }
            query = query.where(condition)
            .select(fields);
            return await query.getMany();
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async getChampionUsers(org_id:any = null, user_id:any = null, fields:any = [], userIds:any = ''){
        try{
            let userCondition = `user.role_id in (2,16) AND user.org_id = ${org_id} AND user.status = 1`;
            if(userIds != ''){
                userCondition += ` AND user.id IN (${userIds})`;
            }
            let user_condition_i = `Wellnessassignment.org_id = ${org_id} AND Wellnessassignment.user_id = ${user_id} AND (
                Wellnessassignment.location = user.location AND user.location != '' OR
                Wellnessassignment.department = user.department_id AND user.department_id != '' OR
                Wellnessassignment.state = u_setting.state AND u_setting.state != '' OR
                Wellnessassignment.city = u_setting.city AND u_setting.city != '' OR
                Wellnessassignment.is_global = 1
            )`;
            const joinTale = [{'alias':'u_setting', 'table' : tableConstant.TBL_USERS_SETTINGS, 'on' : `u_setting.user_id = user.id`, 'connect' : 'user', 'type' : 'INNER' }, {'alias':'Wellnessassignment', 'table' : tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS, 'on' : user_condition_i , 'connect' : 'user', 'type' : 'INNER' }];
            let query = this.readReplicaUserRepository.createQueryBuilder('user');
            if(joinTale && joinTale.length > 0){
                for(let i = 0; i < joinTale.length; i++){
                    if(joinTale[i].type == 'INNER'){
                        query = query.innerJoinAndMapOne(
                            `${joinTale[i].connect}.${joinTale[i].alias}`,
                            joinTale[i].table,
                            joinTale[i].alias,
                            joinTale[i].on,
                        );
                    }else{
                        query = query.leftJoinAndMapOne(
                            `${joinTale[i].connect}.${joinTale[i].alias}`,
                            joinTale[i].table,
                            joinTale[i].alias,
                            joinTale[i].on,
                        );
                    }
                }
            }
            query = query.where(userCondition)
            .select(fields);
            return await query.getMany();
        }catch (error) {
            throw new Error(error.message); 
        }
    }
}
