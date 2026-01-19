import { appConstant, CampaignRewardEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from '../input';
@Injectable()
export class CampaignRewardService {
    constructor(
        @InjectRepository(CampaignRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignRewardRepository: Repository<CampaignRewardEntity>,
        @InjectRepository(CampaignRewardEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignRewardRepository: Repository<CampaignRewardEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithCampaignInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'campaignreward.id';
        const queryResult = await this.readReplicaCampaignRewardRepository.createQueryBuilder('campaignreward')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async checkReward(condition: any) {
        return await this.readReplicaCampaignRewardRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['id', 'campaign_id', 'reward_name', 'reward_desc']) {
        if (!orderBy) {
            orderBy = { order_id: 'ASC' };
        }
        return await this.readReplicaCampaignRewardRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCampaignRewardRepository.create(data);
        return await this.writeReplicaCampaignRewardRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCampaignRewardRepository.metadata);
        return await this.writeReplicaCampaignRewardRepository.createQueryBuilder('campaignreward')
            .update(CampaignRewardEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async updateMultiple(whereOptions:any = {}, setData:any = {}) {
        setData = await this.commonFileService.filterDataByEntityColumns(setData, this.writeReplicaCampaignRewardRepository.metadata);
        let ids = whereOptions['id'];
        return await this.writeReplicaCampaignRewardRepository .createQueryBuilder('campaignreward')
          .update(CampaignRewardEntity)
          .set(setData)
          .where('id IN (:...ids)', { ids })
          .execute();
    }
    async listofIds(condition: any, orderBy: any = null, fields: any = ['id']) {
        if (!orderBy) {
            orderBy = { order_id: 'ASC' };
        }
        let recordData = await this.readReplicaCampaignRewardRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
        return recordData.map((item) => item.id);
    }
    async getOne(condition: any, fields: any = ['campaignreward'], getDetailType: any = 'normal') {
        let query = this.readReplicaCampaignRewardRepository.createQueryBuilder('campaignreward')
        .leftJoinAndMapMany(
            'campaignreward.insurance',
            tableConstant.CAMPAIGN.TBL_IN_INSURANCE_REWARD,
            'insurance',
            `insurance.reward_id = campaignreward.id AND insurance.status = 1`,
        )
        .leftJoinAndMapMany(
            'campaignreward.cash',
            tableConstant.CAMPAIGN.TBL_IN_CASH_REWARD,
            'cash',
            `cash.reward_id = campaignreward.id AND cash.status = 1`,
        )
        .leftJoinAndMapMany(
            'campaignreward.other',
            tableConstant.CAMPAIGN.TBL_IN_OTHER_REWARD,
            'other',
            `other.reward_id = campaignreward.id AND other.status = 1`,
        )
        .where(condition)
        .select(fields);
        return await query.getOne();
    }
    async getRewardsByCampaignId(campaign_id: number): Promise<any[]> {
        try {
            return await this.readReplicaCampaignRewardRepository.find({
                where: {
                    campaign_id: campaign_id,
                    status: 1
                },
                order: {
                    order_id: 'ASC'
                }
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
