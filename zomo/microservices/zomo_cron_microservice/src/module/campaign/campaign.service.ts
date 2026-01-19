import {
    appConstant,
    BaseService,
    CampaignEntity,
    CommonArrayService,
    CommonService,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
const moment = require('moment');
@Injectable()
export class CampaignService extends BaseService<CampaignEntity> {
    constructor(
        @InjectRepository(
            CampaignEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCampaignRepository: Repository<CampaignEntity>,
        @InjectRepository(CampaignEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignRepository: Repository<CampaignEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonService: CommonService,
    ) {
        super(
            readReplicaCampaignRepository,
            writeReplicaCampaignRepository,
            'campaign',
            commonArrayService,
        );
    }
    async findOne(condition: any, fields: any = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCampaignRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }

    async listRecord(
        condition: any,
        orderBy: any = null,
        fields: any = ['campaign.id', 'campaign.campaign_name'],
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCampaignRepository
            .createQueryBuilder('campaign')
            .where(condition)
            .select(fields)
            .orderBy(
                `campaign.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCampaignRepository.create(data);
        return await this.writeReplicaCampaignRepository.save(savedResult);
    }
    async listIncentiveData(
        condition: any,
        fields: any = ['Campaign.id', 'Campaign.campaign_name'],
        orderBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let data = this.readReplicaCampaignRepository
            .createQueryBuilder('Campaign')
            .leftJoinAndMapOne(
                'Campaign.CampaignReward',
                tableConstant.CAMPAIGN.TBL_IN_CAMPAIGN_REWARD,
                'CampaignReward',
                `CampaignReward.campaign_id = Campaign.id`,
            )
            .where(condition)
            .select(fields)
            .orderBy(
                `Campaign.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            );
        return await data.getMany();
    }
}
