import { appConstant, AssessmentTabsEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentTabsService {
    constructor(
        @InjectRepository(AssessmentTabsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentTabsRepository: Repository<AssessmentTabsEntity>,
        @InjectRepository(AssessmentTabsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentTabsRepository: Repository<AssessmentTabsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
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
        const queryResult = await this.readReplicaAssessmentTabsRepository.createQueryBuilder('healthassessment')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any,orderBy: any = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentTabsRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async listRecord(condition: any,field: any[] = [], tableData: any[] = [], orderBy: any = null,req: Request = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaAssessmentTabsRepository.createQueryBuilder('at')
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS)) {
            queryResult = await queryResult.leftJoinAndMapMany(
                'at.aq',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS,
                'aq',
                `at.id = aq.tab_id`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS)) {
            queryResult = await queryResult.leftJoinAndMapOne(
                'aq.aqd',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS,
                'aqd',
                `aq.id = aqd.question_id`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS)) {
            queryResult = await queryResult.leftJoinAndMapMany(
                'aqd.ao',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS,
                'ao',
                `aqd.question_id = ao.question_id AND ao.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS)) {
            queryResult = await queryResult.leftJoinAndMapOne(
                'ao.aod',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS,
                'aod',
                `ao.id = aod.option_id AND aod.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS)) {
            queryResult = await queryResult.leftJoinAndSelect(
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS,
                'ea',
                `ea.user_id = ${req.tokenUser?.id} AND ea.eha_reset = '0'`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT)) {
            queryResult = await queryResult.innerJoinAndMapOne(
                'at.ear',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT,
                'ear',
                `at.id = ear.tab_id AND ea.id = ear.assessment_id AND ear.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER)) {
            queryResult = await queryResult.innerJoinAndMapMany(
                'ear.eaa',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_ANSWER,
                'eaa',
                `ear.id = eaa.result_id AND ea.id = ear.assessment_id AND ao.id = eaa.option_id`,
            )
        }
        queryResult = queryResult.select(field)
            .where(condition)
            .orderBy(`at.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_EMOTIONAL_ASSESSMENTS_RESULT)) {
                queryResult = queryResult.addOrderBy("ear.id","DESC")
                .addOrderBy("eaa.id","DESC")
                .addOrderBy("ea.id","DESC")
            }
        queryResult = await queryResult.getMany();
        return queryResult;
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentTabsRepository.create(data);
        return await this.writeReplicaAssessmentTabsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentTabsRepository.metadata);
        return await this.writeReplicaAssessmentTabsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentTabsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentTabsRepository.delete(condition);
    }
    async find(condition: any) {
        return await this.readReplicaAssessmentTabsRepository.createQueryBuilder('healthassessment')
        .leftJoinAndMapMany(
            'healthassessment.AssessmentQuestions',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS,
            'AssessmentQuestions',
            `AssessmentQuestions.tab_id = healthassessment.id AND healthassessment.status = 1`,
        )
        .leftJoinAndMapOne(
            'AssessmentQuestions.AssessmentQuestionsDetails',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS,
            'AssessmentQuestionsDetails',
            `AssessmentQuestionsDetails.question_id = AssessmentQuestions.id AND AssessmentQuestions.status = 1`,
        )
        .leftJoinAndMapOne(
            'AssessmentQuestions.AssessmentResults',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
            'AssessmentResults',
            `AssessmentResults.id = AssessmentQuestions.result_type AND AssessmentQuestions.status = 1 AND healthassessment.organization_id = AssessmentResults.organization_id`,
        )
        .leftJoinAndMapMany(
            'AssessmentQuestions.AssessmentOptions',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS,
            'AssessmentOptions',
            `AssessmentOptions.question_id = AssessmentQuestions.id AND AssessmentQuestions.status = 1`,
        )
        .leftJoinAndMapOne(
            'AssessmentOptions.AssessmentOptionsDetails',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS,
            'AssessmentOptionsDetails',
            `AssessmentOptionsDetails.option_id = AssessmentOptions.id AND AssessmentOptions.status = 1`,
        )
        .where(condition)
        .getMany();
    }
}