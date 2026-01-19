import {
    appConstant,
    AssessmentHaOptionsEntity,
    BaseService,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class HraOptionsService extends BaseService<AssessmentHaOptionsEntity> {
    constructor(
        @InjectRepository(AssessmentHaOptionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHraOptionsRepository: Repository<AssessmentHaOptionsEntity>,
        @InjectRepository(AssessmentHaOptionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHraOptionsRepository: Repository<AssessmentHaOptionsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaHraOptionsRepository, writeReplicaHraOptionsRepository, 'hraOptions', commonArrayService );
    }

}