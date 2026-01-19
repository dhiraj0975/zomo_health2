import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CampaignRewardEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveCampaignRewardService {
    constructor(
        @InjectRepository(CampaignRewardEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveCampaignRewardRepository: Repository<CampaignRewardEntity>,
        @InjectRepository(CampaignRewardEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveCampaignRewardRepository: Repository<CampaignRewardEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaIncentiveCampaignRewardRepository.create(data);
        return await this.writeReplicaIncentiveCampaignRewardRepository.save(savedResult);
    }
}
