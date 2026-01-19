import {
    appConstant,
    AssessmentResultsEntity,
    BaseService,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class AssessmentResultsService extends BaseService<AssessmentResultsEntity> {
    constructor(
        @InjectRepository(
            AssessmentResultsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAssessmentResultsRepository: Repository<AssessmentResultsEntity>,
        @InjectRepository(
            AssessmentResultsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaAssessmentResultsRepository: Repository<AssessmentResultsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaAssessmentResultsRepository,
            writeReplicaAssessmentResultsRepository,
            'assessmentResults',
            commonArrayService,
        );
    }
}
