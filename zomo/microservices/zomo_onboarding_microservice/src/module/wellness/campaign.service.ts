import {
    appConstant,
    BaseService,
    CampaignEntity,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    ) {
        super(
            readReplicaCampaignRepository,
            writeReplicaCampaignRepository,
            'campaign',
            commonArrayService,
        );
    }

}
