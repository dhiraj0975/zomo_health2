import {
    appConstant,
    BaseService,
    CampaignActivityEntity,
    CampaignEntity,
    CommonArrayService,
    CommonFileService,
    CommonService,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CampaignActivityService extends BaseService<CampaignActivityEntity> {
    constructor(
        @InjectRepository(
            CampaignActivityEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCampaignActivityRepository: Repository<CampaignActivityEntity>,
        @InjectRepository(
            CampaignActivityEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaCampaignActivityRepository: Repository<CampaignActivityEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaCampaignActivityRepository,
            writeReplicaCampaignActivityRepository,
            'campaignActivity',
            commonArrayService,
        );
    }
}
