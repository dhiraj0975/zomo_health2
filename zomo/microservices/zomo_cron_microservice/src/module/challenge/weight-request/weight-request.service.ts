import {
    appConstant, BaseService,
    CommonArrayService,
    WeightRequestEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class WeightRequestService extends BaseService<WeightRequestEntity> {
    constructor(
        @InjectRepository(WeightRequestEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWeightRequestRepository: Repository<WeightRequestEntity>,
        @InjectRepository(WeightRequestEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWeightRequestRepository: Repository<WeightRequestEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaWeightRequestRepository, writeReplicaWeightRequestRepository, 'weightRequest', commonArrayService);
    }

}
