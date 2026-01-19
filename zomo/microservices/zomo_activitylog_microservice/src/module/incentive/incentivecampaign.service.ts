import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IncentiveCampaignEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveCampaignService {
    constructor(
        @InjectRepository(IncentiveCampaignEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveCampaignRepository: Repository<IncentiveCampaignEntity>,
        @InjectRepository(IncentiveCampaignEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveCampaignRepository: Repository<IncentiveCampaignEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaIncentiveCampaignRepository.create(data);
        return await this.writeReplicaIncentiveCampaignRepository.save(savedResult);
    }
}
