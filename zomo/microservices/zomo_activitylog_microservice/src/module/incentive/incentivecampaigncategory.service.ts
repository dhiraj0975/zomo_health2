import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CampaignCategoryEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class IncentiveCampaignCategoryService {
    constructor(
        @InjectRepository(CampaignCategoryEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaIncentiveCampaignCategoryRepository: Repository<CampaignCategoryEntity>,
        @InjectRepository(CampaignCategoryEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaIncentiveCampaignCategoryRepository: Repository<CampaignCategoryEntity>,
    ) {}
    async create(data: any) {
        const savedResult =
            this.writeReplicaIncentiveCampaignCategoryRepository.create(data);
        return await this.writeReplicaIncentiveCampaignCategoryRepository.save(savedResult);
    }
}
