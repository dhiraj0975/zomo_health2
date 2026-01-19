import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CampaignActivityEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveCampaignActivityService {
    constructor(
        @InjectRepository(CampaignActivityEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveCampaignActivityRepository: Repository<CampaignActivityEntity>,
        @InjectRepository(CampaignActivityEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveCampaignActivityRepository: Repository<CampaignActivityEntity>,
    ) {}
    async create(data: any) {
        const savedResult =
            this.writeReplicaIncentiveCampaignActivityRepository.create(data);
        return await this.writeReplicaIncentiveCampaignActivityRepository.save(savedResult);
    }
}
