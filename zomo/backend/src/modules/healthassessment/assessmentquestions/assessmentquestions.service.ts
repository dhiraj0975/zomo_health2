import { appConstant, AssessmentQuestionsEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentQuestionsService {
    constructor(
        @InjectRepository(AssessmentQuestionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentQuestionsRepository: Repository<AssessmentQuestionsEntity>,
        @InjectRepository(AssessmentQuestionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentQuestionsRepository: Repository<AssessmentQuestionsEntity>,
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
                : 'aq.id';
        const queryResult = await this.readReplicaAssessmentQuestionsRepository.createQueryBuilder('aq')
            .leftJoinAndMapOne(
                'aq.aqd',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS,
                'aqd',
                `aq.id = aqd.question_id AND aqd.status != '2'`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, orderBy: any = null,fields: any[] = [],tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaAssessmentQuestionsRepository.createQueryBuilder('aq')
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'aq.at',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_TABS,
                'at',
                `aq.tab_id = at.id`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'aq.aqd',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS,
                'aqd',
                `(aq.id = aqd.question_id OR aq.parent_id = aqd.question_id) AND aqd.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'aq.aod',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS,
                'aod',
                `aq.parent_option_id = aod.option_id AND aod.status != '2' AND aod.main_option_id = 0`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'aq.ar',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                'ar',
                `aq.result_type = ar.id AND ar.status != '2'`,
            )
        }
        queryResult = await queryResult.where(condition).select(fields)
            .orderBy(`aq.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
        return queryResult;
    }
    async listRecord(condition: any, orderBy: any = null,fields: any[] = [],tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaAssessmentQuestionsRepository.createQueryBuilder('aq')
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'aq.aqd',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS_DETAILS,
                'aqd',
                `aq.id = aqd.question_id`,
            )
        }
        queryResult = await queryResult.where(condition).select(fields)
            .orderBy(`aq.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
        return queryResult;
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentQuestionsRepository.create(data);
        return await this.writeReplicaAssessmentQuestionsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentQuestionsRepository.metadata);
        return await this.writeReplicaAssessmentQuestionsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentQuestionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentQuestionsRepository.delete(condition);
    }
}