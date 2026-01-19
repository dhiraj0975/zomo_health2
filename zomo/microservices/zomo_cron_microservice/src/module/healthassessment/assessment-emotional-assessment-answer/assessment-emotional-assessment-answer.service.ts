import {
    appConstant,
    AssessmentEmotionalAssessmentAnswerEntity,
    BaseService,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class AssessmentEmotionalAssessmentAnswerService extends BaseService<AssessmentEmotionalAssessmentAnswerEntity> {
    constructor(
        @InjectRepository(
            AssessmentEmotionalAssessmentAnswerEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAssessmentEmotionalAssessmentAnswerRepository: Repository<AssessmentEmotionalAssessmentAnswerEntity>,
        @InjectRepository(
            AssessmentEmotionalAssessmentAnswerEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaAssessmentEmotionalAssessmentAnswerRepository: Repository<AssessmentEmotionalAssessmentAnswerEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaAssessmentEmotionalAssessmentAnswerRepository,
            writeReplicaAssessmentEmotionalAssessmentAnswerRepository,
            'assessmentEmotionalAssessment',
            commonArrayService,
        );
    }
}
