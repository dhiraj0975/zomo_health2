import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CampaignChallengeEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveCampaignChallengeService {
    constructor(
        @InjectRepository(CampaignChallengeEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveCampaignChallengeRepository: Repository<CampaignChallengeEntity>,
        @InjectRepository(CampaignChallengeEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveCampaignChallengeRepository: Repository<CampaignChallengeEntity>,
    ) {}
    async create(data: any) {
        const savedResult =
            this.writeReplicaIncentiveCampaignChallengeRepository.create(data);
        return await this.writeReplicaIncentiveCampaignChallengeRepository.save(
            savedResult,
        );
    }
}
