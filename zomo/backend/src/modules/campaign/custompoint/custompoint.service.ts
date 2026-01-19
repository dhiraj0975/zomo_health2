import { appConstant, BrokerEntity, CampaignActivityEntity, CampaignEntity, CampaignRewardEntity, CoachesEntity, CommonArrayService, CommonFileService, CustomPointEntity, CustomPointRequestEntity, tableConstant, UserEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from '../input';
@Injectable()
export class CustomPointService {
    constructor(
        @InjectRepository(CustomPointEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCustomPointRepository: Repository<CustomPointEntity>,
        @InjectRepository(CustomPointEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCustomPointRepository: Repository<CustomPointEntity>,
        @InjectRepository(CampaignActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacampaignActivityRepository: Repository<CampaignActivityEntity>,
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicauserRepository: Repository<UserEntity>,
        @InjectRepository(BrokerEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicabrokerRepository: Repository<BrokerEntity>,
        @InjectRepository(CampaignEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacampaignRepository: Repository<CampaignEntity>,
        @InjectRepository(CampaignRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacampaignRewardRepository: Repository<CampaignRewardEntity>,
        @InjectRepository(CustomPointRequestEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacustomPointRequestRepository: Repository<CustomPointRequestEntity>,
        @InjectRepository(CustomPointRequestEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacustomPointRequestRepository: Repository<CustomPointRequestEntity>,
        @InjectRepository(CoachesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacoachRepository: Repository<CoachesEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithCampaignInput, fields: any = ['custompoint.id', 'custompoint.user_id', 'custompoint.user_name', 'custompoint.activity_name', 'custompoint.date', 'custompoint.org_id', 'custompoint.activity_id', 'custompoint.point', 'custompoint.created_date', 'custompoint.request_id', 'campaignactivity.id', 'campaignreward.id', 'campaignreward.reward_name', 'user.username', 'user.code']) {
        const paginateObj = this.commonArrayService.getPaginationVar(paginationParam.page || 1, paginationParam.limit);
        const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'custompoint.id';
        let queryResult:any = this.readReplicaCustomPointRepository.createQueryBuilder('custompoint')
            .innerJoinAndMapOne(
                'custompoint.user',
                tableConstant.TBL_USERS,
                'user',
                `custompoint.user_id = user.id `,
            )
            .leftJoinAndMapOne(
                'custompoint.campaignactivity',
                tableConstant.CAMPAIGN.TBL_CAMPAIGN_ACTIVITY,
                'campaignactivity',
                `custompoint.activity_id = campaignactivity.id `,
            )
            .leftJoinAndMapOne(
                'campaignactivity.campaignreward',
                tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_REWARD,
                'campaignreward',
                `campaignactivity.reward_id = campaignreward.id `,
            )
            .where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip);
            queryResult = await queryResult.getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async paginateRequestList(condition: any, paginationParam: PaginateWithCampaignInput, fields: any = ['custompointrequest']) {
        const paginateObj = this.commonArrayService.getPaginationVar(paginationParam.page || 1, paginationParam.limit);
        const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'custompointrequest.id';
        let queryResult:any = this.readReplicacustomPointRequestRepository.createQueryBuilder('custompointrequest')
            .leftJoinAndMapOne(
                'custompointrequest.campaign',
                tableConstant.CAMPAIGN.TBL_CAMPAIGN,
                'campaign',
                `custompointrequest.campaign_id = campaign.id `,
            )
            .leftJoinAndMapOne(
                'custompointrequest.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `custompointrequest.org_id = company.id `,
            )
            .where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip);
            queryResult = await queryResult.getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaCustomPointRepository.findOne({
            where: condition,
        });
    }

    async requestFindOne(condition: any, fields: any = ['custompointrequest.id', 'custompointrequest.org_id','custompointrequest.campaign_id'], joinTale: any = [],orderBy: any = null) {
        if (!orderBy) {
            orderBy = {'custompointrequest.request_date': 'ASC' };
        }
        let query = this.readReplicacustomPointRequestRepository.createQueryBuilder('custompointrequest');
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
        return await query.where(condition)
        .select(fields)
        .orderBy(orderBy)
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['id', 'user_id', 'user_name', 'point']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCustomPointRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        data = Object.values(data);
        const savedResult = this.writeReplicaCustomPointRepository.create(data);
        return await this.writeReplicaCustomPointRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCustomPointRepository.metadata);
        return await this.writeReplicaCustomPointRepository.createQueryBuilder('custompoint')
            .update(CustomPointEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async requestUpdate(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacustomPointRequestRepository.metadata);
        return await this.writeReplicacustomPointRequestRepository.createQueryBuilder('custompointrequest')
            .update(CustomPointRequestEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async getUsers(condition: any, fields: any = ['id', 'name'], joinTale: any = []) {
        let query = this.readReplicauserRepository.createQueryBuilder('user');
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
            return await query.where(condition)
            .select(fields)
            .orderBy({
                'user.id': 'ASC',
            })
            .getMany();
    }
    async usersDataWellness(user: any) {
        let condition;
        let wellnessCondition;
        let query = this.readReplicauserRepository.createQueryBuilder('user');
        wellnessCondition = `wellnessAssignment.org_id = ${user.org_id} AND wellnessAssignment.user_id = ${user.id}
        AND(
        (wellnessAssignment.location = user.location AND user.location != 0) OR
        (wellnessAssignment.department = user.department_id AND user.department_id != 0) OR
        (wellnessAssignment.state = settings.state AND settings.state !='') OR
        (wellnessAssignment.city = settings.city AND settings.city !='') OR
        wellnessAssignment.is_global = 1
        )`;
        query = query
        .innerJoinAndMapOne(
            'user.settings',
            tableConstant.TBL_USERS_SETTINGS,
            'settings',
            `settings.user_id = user.id`,
        )
        .innerJoinAndMapOne(
            'user.wellnessAssignment',
            tableConstant.COMPANIES.TBL_COMPANY_WELLNESS_ASSIGNMENTS,
            'wellnessAssignment',
            wellnessCondition,
        );
        condition = `user.org_id = ${user.org_id}`;
        query = query
        .where(condition)
        .select(['user.id']);
        return await query.getMany();
    }
    async checkBrokerUser(condition: any, fields: any = ['broker.id', 'broker.org_id']) {
        return await this.readReplicabrokerRepository.createQueryBuilder('broker')
        .where(condition)
        .select(fields)
        .getMany();
    }
    async checkCoachUser(condition: any, fields: any = ['coachs.id', 'coachs.org_id']) {
        return await this.readReplicacoachRepository.createQueryBuilder('coachs')
        .where(condition)
        .select(fields)
        .getMany();
    }
    async getCampaignData(condition: any) {
        let queryResult: any = this.readReplicacampaignRepository.createQueryBuilder('campaign');
        queryResult = await queryResult.where(condition)
        .getOne();
        return queryResult;
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
    async saveRequest(data: any) {
        const savedResult = this.writeReplicacustomPointRequestRepository.create(data);
        return await this.writeReplicacustomPointRequestRepository.save(savedResult);
    }
}
