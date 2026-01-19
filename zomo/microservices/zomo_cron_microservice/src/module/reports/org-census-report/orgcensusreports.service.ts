import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    UserEntity,
    ActivePluginsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserService } from '../../user/user.service';
import { FrontService } from '../../campaign/front/front.service';
import { CampaignDashboardService } from '../../campaign/campaigndashboard.service';
import { ActivePluginService } from '../../company';
import { FrontCalculationService } from '../../campaign/front/frontcalculation.service';
@Injectable()
export class OrgCensusReportsService {
    constructor(
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        private readonly frontService: FrontService,
        private readonly campaignDashboardService: CampaignDashboardService,    
        private readonly activePluginService: ActivePluginService,
        private readonly frontCalculationService: FrontCalculationService,
        private readonly userService: UserService,
    ) {}

    async getBrokerDataByIds(brokerIds: string[]){
        try{
            let condition = `user.id IN (${brokerIds.join(',')})`;
            let fields = [
                'user.id',
                'user.first_name',
                'user.last_name',
                'user.code',
            ];
            let query = this.readReplicaUserRepository.createQueryBuilder('user');
            query = query.where(condition)
            .select(fields);
            return await query.getMany();
        }catch (error) {
            throw new Error(error.message); 
        }
    }


    async getAllOrgUsers(orgCodes: string[]){
        try{
            let condition = `user.membership_code IN ("${orgCodes.join('","')}") AND user.status = 1 AND user.role_id IN (2,16)`;
            let query = this.readReplicaUserRepository.createQueryBuilder('user');
            query = query.select([
                            'user.membership_code as membership_code',
                        ])
                        .addSelect(`COUNT(CASE WHEN user.role_id = 2 THEN 1 END)`, 'user_count')
                        .addSelect(`COUNT(CASE WHEN user.role_id = 16 THEN 1 END)`, 'spouse_count')
                        .addSelect(
                            `COUNT(
                                CASE 
                                    WHEN (
                                        user.on_insurance_plan IN ('Yes','yes','Y','y','YES')
                                        AND user.role_id = 2
                                    ) THEN 1 
                                END
                            )`,
                            'on_health_count'
                        )
                        .addSelect(
                            `COUNT(
                                CASE 
                                    WHEN (
                                        user.on_insurance_plan IN ('No','no','NO','', NULL)
                                        AND user.role_id = 2
                                    ) THEN 1 
                                END
                            )`,
                            'off_health_count'
                        )
                        .where(condition)
                        .groupBy('user.membership_code');

            return await query.getRawMany();
        }catch (error) {
            throw new Error(error.message); 
        }
    }

    async getOrgActivityData(orgId:any = null, membershipCode:string = '', campaigns = {}){
        try{
            if(campaigns && Object.keys(campaigns).length > 0){
                let activePluginData: ActivePluginsEntity | null =
                    await this.activePluginService.getOne(
                        { company_id: orgId },
                        ['plugin_name'],
                        { id: 'DESC' },
                    );
                let activePlugins: string[] = [];
                if (activePluginData) {
                    activePlugins = Object.keys(
                        JSON.parse(activePluginData.plugin_name),
                    );
                }
                let userData: UserEntity[] = [];
                let condition = `users.membership_code = '${membershipCode}' AND users.status = 1 AND users.role_id IN (2,16)`;
                let filedArray = ['users.id', 'users.code', 'users.role_id', 'users.is_camp_eligible', 'users.username', 'users.membership_code', 'users.last_name', 'users.first_name', 'users.middle_name', 'users.securitycode', 'users.employeeid', 'users.dob', 'users.on_insurance_plan', 'users.insurance_plan_name', 'users.gender', 'users.date_of_hire', 'users.email', 'users.location', 'users.department_id', 'users.relationship_id', 'userSetting.cphone', 'userSetting.wphone_ext', 'userSetting.jobtitle', 'userSetting.wphone', 'userSetting.hphone', 'userSetting.address', 'userSetting.address2', 'userSetting.state', 'userSetting.zip', 'userSetting.country', 'userSetting.city',  'department.dept_name', 'location.lname', 'location.address1', 'location.address2', 'location.city', 'location.state', 'location.zip', 'location.country' ];
                userData = await this.userService.commonQueryBuilder(
                    filedArray,
                    condition,
                    { 'users.id': 'ASC' },
                    [
                        {
                            join_table: 'users.userSetting',
                            alias: 'userSetting',
                            table: tableConstant.TBL_USERS_SETTINGS,
                            on_condition: `userSetting.user_id=users.id`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'users.department',
                            alias: 'department',
                            table: tableConstant.COMPANIES.TBL_DEPARTMENT,
                            on_condition: `department.id=users.department_id`,
                            join_type: 'left_one',
                        },
                        {
                            join_table: 'users.location',
                            alias: 'location',
                            table: tableConstant.COMPANIES.TBL_LOCATION,
                            on_condition: `location.id=users.location`,
                            join_type: 'left_one',
                        },
                    ],
                    'getMany',
                );
                let totalUsers = userData.length;
                let campaignUsers = userData;
                const userIds = userData.map(user => user.id);
                const userIdsString = userIds.join(',');
                const allUsersDOHInfoData: Record<number, number> = Object.fromEntries(
                    await Promise.all(
                        userData
                        .filter(users => users?.date_of_hire)
                        .map(async users => [
                            users.id,
                            await this.commonDateService.DateTimeFormat(users.date_of_hire, 'timestamp')
                        ])
                    )
                );
                const campaginDatas = await this.frontService.getCampaignList(`campaign.organization_id = ${orgId} AND  campaign.id IN (${Object.values(campaigns).join(',')}) AND campaign.status = 1`, { end_date : 'ASC' }, ['campaign']);
                if(campaginDatas.length == 0){
                    return 0;
                }else{
                    let campaignData = {};
                    for (let campaignRaw of campaginDatas) {
                        let campaignId = campaignRaw.id;
                        let campaignIdStr = campaignRaw.id;
                        if(!campaignData[campaignIdStr]){
                            campaignData[campaignIdStr] = {};
                        }
                        if(!campaignData[campaignIdStr]['campaign']){
                            campaignData[campaignIdStr]['campaign'] = {};
                        }
                        if(!campaignData[campaignIdStr]['campaignRewards']){
                            campaignData[campaignIdStr]['campaignRewards'] = {};
                        }
                        campaignData[campaignIdStr]['campaign'] = campaignRaw;
                        let getRewardCondition = `reward.campaign_id = ${campaignIdStr} AND reward.status = 1`;
                        let orderBy = { order_id: 'ASC' };
                        let rewards = await this.campaignDashboardService.getRewardsData(getRewardCondition, orderBy);
                        if(rewards || rewards.length > 0) {
                            let otherCondition = '';
                            let departmentIds = [];
                            let locationIds = [];
                            if((campaignRaw['department_ids'] !== '0' && campaignRaw['department_ids'] != '' && campaignRaw['department_ids'] != null) || (campaignRaw['location_ids'] !== '0' && campaignRaw['location_ids'] != '' && campaignRaw['location_ids'] != null)){
                                departmentIds = (campaignRaw?.['department_ids']) ? campaignRaw['department_ids'].split(',') : [];
                                locationIds = (campaignRaw?.['location_ids']) ? campaignRaw['location_ids'].split(',') : [];
                                if(campaignRaw['department_ids'] !== '0' && campaignRaw['department_ids'] != '' && campaignRaw['department_ids'] != null){
                                    if(campaignRaw['location_ids'] !== '0' && campaignRaw['location_ids'] != '' && campaignRaw['location_ids'] != null){
                                        otherCondition = `user.department_id in(${campaignRaw['department_ids']}) AND user.location in(${campaignRaw['location_ids']}) AND `;
                                    }else{
                                        otherCondition = `user.department_id in(${campaignRaw['department_ids']}) AND `;
                                    }
                                }else{
                                    otherCondition = `user.location in(${campaignRaw['location_ids']}) AND `;
                                }
                            }
                            let statusCondition = ` AND user.status = '1' `; // AND user.id = 599823 --- TO BE REMOVED AFTER DEMO ---
                            let rewOtherData = [ { 'membershipCode' : membershipCode }, { 'otherCondition' : otherCondition }, { 'company_id' : orgId }, { 'campaignId' : campaignId },{ 'activePlugins' : activePlugins }, { 'campaignId' : campaignId }, { 'statusCondition' : statusCondition }, { 'allUsersDOHInfoData' : allUsersDOHInfoData }];
                            let rewardDatas = await this.campaignDashboardService.getMultiRewarddatas(10, JSON.parse(JSON.stringify(rewards)), rewOtherData); /* 10 is Org report */
                            let rewardWiseUsers = new Map();
                            let camOtherData = [ { 'membershipCode' : membershipCode }, { 'totalUsers' : totalUsers }, { 'userDatas' : userData }, { 'company_id' : orgId }, { 'campaignId' : campaignId },{ 'activePlugins' : activePlugins }, { 'campaignId' : campaignId }];
                            let rewardWiseUserDatas:any = await this.frontCalculationService.getCampaignUserCalculation(5, JSON.parse(JSON.stringify(rewardDatas)), camOtherData);
                            campaignData[campaignIdStr]['campaignRewards'] = rewardWiseUserDatas;
                        }
                    }

                    if(campaignData && Object.keys(campaignData).length > 0){
                        const finalLetastCompleteCount = await this.mergeCampaignRewardsByOrgId(campaignData);  
                        if(finalLetastCompleteCount.hasOwnProperty(orgId) !== false){
                            return Object.keys(finalLetastCompleteCount[orgId]).length;
                        }
                    }
                    return 0;
                }
            }else{
                return 0;
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }

    async mergeCampaignRewardsByOrgId(campaignData: any) {
        const mergedByOrgId: { [key: number]: { [key: string]: string } } = {};
        for (const campaignId in campaignData) {
            const campaign = campaignData[campaignId];
            const orgId = campaign.campaign.organization_id;
            
            if (!mergedByOrgId[orgId]) {
                mergedByOrgId[orgId] = {};
            }
            const completeLOneAll = campaign.campaignRewards[0].completeLOneAll;
            Object.assign(mergedByOrgId[orgId], completeLOneAll);
        }

        return mergedByOrgId;
    }
}
