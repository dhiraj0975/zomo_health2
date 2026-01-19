import {
    appConstant, BaseService, BiometricHealthRequestEntity,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class BiometricHealthRequestService extends BaseService<BiometricHealthRequestEntity> {
    constructor(
        @InjectRepository(BiometricHealthRequestEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthRequestRepository: Repository<BiometricHealthRequestEntity>,
        @InjectRepository(BiometricHealthRequestEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthRequestRepository: Repository<BiometricHealthRequestEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaHealthRequestRepository, writeReplicaHealthRequestRepository, 'biometricHealthRequest', commonArrayService);
    }

}
