import {
    appConstant,
    AssessmentHaQuestionsEntity,
    BaseService,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class HraQuestionsService extends BaseService<AssessmentHaQuestionsEntity> {
    constructor(
        @InjectRepository(AssessmentHaQuestionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHraQuestionsRepository: Repository<AssessmentHaQuestionsEntity>,
        @InjectRepository(AssessmentHaQuestionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHraQuestionsRepository: Repository<AssessmentHaQuestionsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaHraQuestionsRepository, writeReplicaHraQuestionsRepository, 'hraQuestions', commonArrayService );
    }

}