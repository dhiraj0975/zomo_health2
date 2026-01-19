import {
    appConstant,
    BaseService,
    CommonArrayService,
    FitnessActivityEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FitnessActivityService extends BaseService<FitnessActivityEntity> {
    constructor(
        @InjectRepository(FitnessActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessActivityRepository: Repository<FitnessActivityEntity>,
        @InjectRepository(FitnessActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFitnessActivityRepository: Repository<FitnessActivityEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaFitnessActivityRepository, writeReplicaFitnessActivityRepository, 'fitnessActivity', commonArrayService);
    }

}
