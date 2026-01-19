import {
    appConstant,
    AssessmentOptionsEntity,
    BaseService,
    CommonArrayService,
    CommonFileService,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class AssessmentOptionsService extends BaseService<AssessmentOptionsEntity> {
    constructor(
        @InjectRepository(
            AssessmentOptionsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAssessmentOptionsRepository: Repository<AssessmentOptionsEntity>,
        @InjectRepository(
            AssessmentOptionsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaAssessmentOptionsRepository: Repository<AssessmentOptionsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaAssessmentOptionsRepository,
            readReplicaAssessmentOptionsRepository,
            'assessmentOptions',
            commonArrayService,
        );
    }
}
