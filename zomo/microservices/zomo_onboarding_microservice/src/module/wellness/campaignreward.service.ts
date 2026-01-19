import {
    appConstant,
    BaseService,
    CampaignRewardEntity,
    CommonArrayService,
    CommonService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CampaignRewardService extends BaseService<CampaignRewardEntity> {
    constructor(
        @InjectRepository(
            CampaignRewardEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCampaignRewardRepository: Repository<CampaignRewardEntity>,
        @InjectRepository(
            CampaignRewardEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCampaignRewardRepository: Repository<CampaignRewardEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaCampaignRewardRepository,
            writeReplicaCampaignRewardRepository,
            'campaignReward',
            commonArrayService,
        );
    }

}
