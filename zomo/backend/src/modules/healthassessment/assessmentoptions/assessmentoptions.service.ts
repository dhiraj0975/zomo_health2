import { appConstant, AssessmentOptionsEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentOptionsService {
    constructor(
        @InjectRepository(AssessmentOptionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentOptionsRepository: Repository<AssessmentOptionsEntity>,
        @InjectRepository(AssessmentOptionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentOptionsRepository: Repository<AssessmentOptionsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(fields: any[] = [],condition: any, paginationParam: PaginateWithHealthAssessmentInput) {
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
                : 'ao.id';
        const queryResult = await this.readReplicaAssessmentOptionsRepository.createQueryBuilder('ao')
            .leftJoinAndMapOne(
                'ao.aod',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS,
                'aod',
                `ao.id = aod.option_id AND aod.status != '2'`,
            ).leftJoinAndMapOne(
                'ao.aq',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS,
                'aq',
                `aq.id = ao.question_id AND aq.status != '2'`,
            )
            .where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, field: any[] = [], orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaAssessmentOptionsRepository.createQueryBuilder('ao')
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ao.aod',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS,
                'aod',
                `ao.id = aod.option_id`,
            )
        }
        queryResult = await queryResult.where(condition).select(field)
            .orderBy(`ao.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
        return queryResult;
    }
    async listRecord(condition: any, orderBy: any = null,fields: any[] = [],tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaAssessmentOptionsRepository.createQueryBuilder('ao')
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ao.aod',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_OPTIONS_DETAILS,
                'aod',
                `ao.id = aod.option_id`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ao.aq',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_QUESTIONS,
                'aq',
                `ao.question_id = aq.id AND aq.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ao.ar',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                'ar',
                `aq.result_type = ar.id AND ar.status = '1'`,
            )
        }
        queryResult = await queryResult.where(condition).select(fields)
            .orderBy(`ao.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
        return queryResult;
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentOptionsRepository.create(data);
        return await this.writeReplicaAssessmentOptionsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentOptionsRepository.metadata);
        return await this.writeReplicaAssessmentOptionsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentOptionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentOptionsRepository.delete(condition);
    }
}