import {
    appConstant,
    AssessmentQuestionsEntity,
    BaseService,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class AssessmentQuestionsService extends BaseService<AssessmentQuestionsEntity> {
    constructor(
        @InjectRepository(AssessmentQuestionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentQuestionsRepository: Repository<AssessmentQuestionsEntity>,
        @InjectRepository(AssessmentQuestionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentQuestionsRepository: Repository<AssessmentQuestionsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaAssessmentQuestionsRepository,
            writeReplicaAssessmentQuestionsRepository,
            'assessmentQuestions',
            commonArrayService,
        );
    }
}