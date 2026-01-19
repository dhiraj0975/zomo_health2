import {
    appConstant,
    BaseService,
    CampaignEntity,
    CommonArrayService,
    CommonFileService,
    CampaignRewardEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from '../input';
const moment = require('moment-timezone');
@Injectable()
export class CampaignService  extends BaseService<CampaignEntity> {
    constructor(
        @InjectRepository(CampaignEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignRepository: Repository<CampaignEntity>,
        @InjectRepository(CampaignEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignRepository: Repository<CampaignEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        @InjectRepository(CampaignRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignRewardRepository: Repository<CampaignRewardEntity>,
    ) {
        super(readReplicaCampaignRepository,writeReplicaCampaignRepository,'campaign',commonArrayService);
    }
    async paginateList(condition: any, paginationParam: PaginateWithCampaignInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'campaign.id';
        let queryResult:any = this.readReplicaCampaignRepository.createQueryBuilder('campaign')
        .leftJoinAndMapOne(
            'campaign.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = campaign.organization_id`,
          )
            .where(condition)
            .orderBy('company.company_name', 'ASC')
            .addOrderBy('campaign.campaign_name', 'ASC')
            .take(paginateObj.take)
            .skip(paginateObj.skip);
            queryResult = await queryResult.getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, orderBy: any = null,fields : any = ['campaign'],tableData: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaCampaignRepository.createQueryBuilder('campaign')
            if (tableData == null) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'campaign.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = campaign.organization_id AND company.status = 1`,
                )
            }
        queryResult = await queryResult.where(condition)
        .select(fields)
        .orderBy(`campaign.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
        return queryResult;
    }
    async listRecord(condition: any, orderBy: any = null, fields : any = ['campaign.id', 'campaign.campaign_name', 'campaign.start_date', 'campaign.end_date']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCampaignRepository.createQueryBuilder('campaign')
            .where(condition)
            .select(fields)
            .orderBy(`campaign.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCampaignRepository.create(data);
        return await this.writeReplicaCampaignRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCampaignRepository.metadata);
        return await this.writeReplicaCampaignRepository.createQueryBuilder('campaign')
            .update(CampaignEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listIncentiveData(condition: any, fields : any = ['Campaign.id', 'Campaign.campaign_name'],orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let data = this.readReplicaCampaignRepository.createQueryBuilder('Campaign')
            .leftJoinAndMapOne(
                'Campaign.CampaignReward',
                tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_REWARD,
                'CampaignReward',
                `CampaignReward.campaign_id = Campaign.id`,
            )
            .where(condition)
            .select(fields)
            .orderBy(`Campaign.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        return await data.getMany();
    }
    async getCampaignRewardDetails(campaign_id: number, subItemIds: number[]): Promise<any> {
        try {
            const campaign = await this.readReplicaCampaignRepository.findOne({
                select: ['id', 'campaign_name', 'start_date', 'end_date'],
                where: { id: campaign_id }
            });

            if (!campaign) {
                return null;
            }
            
            const rewards = await this.readReplicaCampaignRewardRepository
                .createQueryBuilder('cr')
                .leftJoinAndSelect('cr.Cashreward', 'cash', 'cash.status = 1')
                .leftJoinAndSelect('cr.Insurancereward', 'ins', 'ins.status = 1')
                .leftJoinAndSelect('ins.Insuranceplan', 'plan', 'plan.status = 1')
                .leftJoinAndSelect('cr.Otherreward', 'other', 'other.status = 1')
                .where('cr.campaign_id = :campaign_id', { campaign_id })
                .andWhere('cr.id IN (:...subItemIds)', { subItemIds })
                .andWhere('cr.status = 1')
                .getMany();

            return {
                campaign_name: campaign.campaign_name,
                start_date: campaign.start_date,
                end_date: campaign.end_date,
                Campaignreward: rewards
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getCampaignSummaryDetails(campaign_id: number, org_id: number): Promise<any[]> {
        try {
            return await this.readReplicaCampaignRepository.find({
                select: ['id', 'campaign_name', 'start_date', 'end_date'],
                where: {
                    id: campaign_id,
                    organization_id: org_id,
                    status: 1
                }
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getCampaignById(campaign_id: number): Promise<any> {
        try {
            return await this.readReplicaCampaignRepository.findOne({
                where: { id: campaign_id }
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
