import {appConstant, BaseService, BioWeightEntity, CampaignRewardEntity, CommonArrayService} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CampaignRewardService extends BaseService<CampaignRewardEntity>{
    constructor(
        @InjectRepository(CampaignRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignRewardRepository: Repository<CampaignRewardEntity>,
        @InjectRepository(CampaignRewardEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignRewardRepository: Repository<CampaignRewardEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaCampaignRewardRepository, writeReplicaCampaignRewardRepository, 'campaignReward', commonArrayService);
    }

    async listRecord(condition: any, fields: any = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCampaignRewardRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
}
