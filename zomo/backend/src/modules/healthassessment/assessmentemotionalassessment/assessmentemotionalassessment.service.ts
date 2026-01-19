import {
    appConstant,
    AssessmentEmotionalAssessmentEntity,
    BaseService,
    CommonArrayService,
    CommonFileService,
    tableConstant
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentEmotionalAssessmentService  extends BaseService<AssessmentEmotionalAssessmentEntity> {
    constructor(
        @InjectRepository(AssessmentEmotionalAssessmentEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentEmotionalAssessmentRepository: Repository<AssessmentEmotionalAssessmentEntity>,
        @InjectRepository(AssessmentEmotionalAssessmentEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentEmotionalAssessmentRepository: Repository<AssessmentEmotionalAssessmentEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaAssessmentEmotionalAssessmentRepository,writeReplicaAssessmentEmotionalAssessmentRepository,'emotionalAssessment',commonArrayService);
    }
    async paginateList(condition: any, paginationParam: PaginateWithHealthAssessmentInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'healthassessment.id';
        const queryResult = await this.readReplicaAssessmentEmotionalAssessmentRepository.createQueryBuilder('healthassessment')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any,orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentEmotionalAssessmentRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async assessmentFindOne(condition: any, orderBy: any = null, fields: any[] = [],tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult:any = this.readReplicaAssessmentEmotionalAssessmentRepository.createQueryBuilder('healthassessment')
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'healthassessment.ear',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT,
                'ear',
                `ear.assessment_id = healthassessment.id AND ear.status = '1'`
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'ear.eaa',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER,
                'eaa',
                `eaa.result_id = ear.id `
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'eaa.ao',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS,
                'ao',
                `eaa.option_id = ao.id AND ao.status = '1'`
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ao.aq',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS,
                'aq',
                `aq.id = ao.question_id AND aq.status = '1'`
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'aq.ar',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                'ar',
                `ar.id = aq.result_type`
            )
        }
        queryResult = await queryResult.where(condition)
            .select(fields)
            .orderBy(`healthassessment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
        return queryResult;
    }
    async listRecord(condition: any, orderBy: any = null, fields: any[] = [],tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult:any = this.readReplicaAssessmentEmotionalAssessmentRepository.createQueryBuilder('healthassessment')
        if (tableData.includes(tableConstant.ACTIVITIES.TBL_ACTIVITIES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'healthassessment.activity',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'activity',
                `activity.id = healthassessment.activity_id`
            )
        }
        if (tableData.includes(tableConstant.TBL_USERS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'healthassessment.users',
                tableConstant.TBL_USERS,
                'users',
                `users.id = healthassessment.user_id`
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'healthassessment.ear',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT,
                'ear',
                `ear.assessment_id = healthassessment.id AND ear.status = '1'`
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'ear.eaa',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER,
                'eaa',
                `eaa.result_id = ear.id `
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'eaa.ao',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS,
                'ao',
                `eaa.option_id = ao.id AND ao.status = '1'`
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ao.aq',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS,
                'aq',
                `aq.id = ao.question_id AND aq.status = '1'`
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'aq.ar',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                'ar',
                `ar.id = aq.result_type`
            )
        }
        queryResult = await queryResult.where(condition)
        .select(fields)
        .orderBy(`healthassessment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
        return queryResult;
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentEmotionalAssessmentRepository.create(data);
        return await this.writeReplicaAssessmentEmotionalAssessmentRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentEmotionalAssessmentRepository.metadata);
        return await this.writeReplicaAssessmentEmotionalAssessmentRepository.createQueryBuilder('healthassessment')
            .update(AssessmentEmotionalAssessmentEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentEmotionalAssessmentRepository.delete(condition);
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