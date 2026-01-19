import {
    appConstant,
    BaseService,
    BodyFeedsEntity,
    CommonArrayService,
    CommonFileService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class BodyFeedService extends BaseService<BodyFeedsEntity> {
    constructor(
        @InjectRepository(
            BodyFeedsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaBodyFeedsRepository: Repository<BodyFeedsEntity>,
        @InjectRepository(BodyFeedsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBodyFeedsRepository: Repository<BodyFeedsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaBodyFeedsRepository,
            writeReplicaBodyFeedsRepository,
            'bodyFeeds',
            commonArrayService,
        );
    }
}
