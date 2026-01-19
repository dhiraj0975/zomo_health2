import {
    appConstant,
    AssessmentEmotionalAssessmentEntity,
    BaseService,
    CommonArrayService,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class AssessmentEmotionalAssessmentService extends BaseService<AssessmentEmotionalAssessmentEntity> {
    constructor(
        @InjectRepository(
            AssessmentEmotionalAssessmentEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaAssessmentEmotionalAssessmentRepository: Repository<AssessmentEmotionalAssessmentEntity>,
        @InjectRepository(
            AssessmentEmotionalAssessmentEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaAssessmentEmotionalAssessmentRepository: Repository<AssessmentEmotionalAssessmentEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaAssessmentEmotionalAssessmentRepository,
            writeReplicaAssessmentEmotionalAssessmentRepository,
            'emotionalAssessment',
            commonArrayService,
        );
    }
    async assessmentListRecord(condition: any,orderBy: any = null) {
        let queryResult = await this.readReplicaAssessmentEmotionalAssessmentRepository.createQueryBuilder('emotional_assessments')
            .leftJoinAndMapMany("emotional_assessments.emotional_assessments_results",tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT, "emotional_assessments_results","emotional_assessments.id = emotional_assessments_results.assessment_id AND emotional_assessments_results.status = '1'",)
            .leftJoinAndMapMany("emotional_assessments_results.emotional_assessments_answers", tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER,"emotional_assessments_answers","emotional_assessments_results.assessment_id = emotional_assessments_answers.assessment_id AND emotional_assessments_results.id = emotional_assessments_answers.result_id")
            .leftJoinAndMapOne("emotional_assessments_answers.assessment_options", tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS,"assessment_options", "assessment_options.id = emotional_assessments_answers.option_id AND assessment_options.status = '1'")
            .leftJoinAndMapOne("assessment_options.assessment_questions", tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS, "assessment_questions", "assessment_questions.id = assessment_options.question_id AND assessment_questions.status = '1'")
            .leftJoinAndMapOne("assessment_questions.assessment_results", tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS, "assessment_results", "assessment_results.id = assessment_questions.result_type AND assessment_results.status = '1'")
            .orderBy(`emotional_assessments.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .where(condition)
            .getOne();
        return queryResult;
    }
}
