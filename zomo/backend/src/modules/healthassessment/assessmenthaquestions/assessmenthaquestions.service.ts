import {
    appConstant,
    AssessmentHaQuestionsEntity,
    BaseService,
    CommonArrayService,
    CommonFileService,
    tableConstant
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { ActivityLogService } from "src/modules/master/activitylog/activitylog.service";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentHaQuestionsService extends BaseService<AssessmentHaQuestionsEntity> {
    constructor(
        @InjectRepository(AssessmentHaQuestionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentQuestionsRepository: Repository<AssessmentHaQuestionsEntity>,
        @InjectRepository(AssessmentHaQuestionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentQuestionsRepository: Repository<AssessmentHaQuestionsEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly activityLogService: ActivityLogService,
    ) {
        super(readReplicaAssessmentQuestionsRepository, writeReplicaAssessmentQuestionsRepository, 'haQuestions', commonArrayService );
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
                ? `healthassessment.${paginationParam.order_by}`
                : 'healthassessment.id';
        const queryResult = await this.readReplicaAssessmentQuestionsRepository.createQueryBuilder('healthassessment')
        .leftJoinAndMapOne(
            'healthassessment.parent',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_QUESTIONS,
            'parent',
            `parent.id = healthassessment.parent_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaAssessmentQuestionsRepository.createQueryBuilder('healthassessment')
        .leftJoinAndMapOne(
            'healthassessment.parent',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_QUESTIONS,
            'parent',
            `parent.id = healthassessment.parent_id`,
          )
          .leftJoinAndMapMany(
            'healthassessment.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `FIND_IN_SET(company.id, healthassessment.company_id)`,
          )
        .where(condition)
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, select: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentQuestionsRepository.createQueryBuilder('healthassessment')
        .leftJoinAndMapMany(
            'healthassessment.option',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_OPTIONS,
            'option',
            `option.question_id = healthassessment.id AND option.status != '2'`,
          )
        .where(condition)
        .select(select)
        .orderBy(`healthassessment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .addOrderBy(`option.order`, 'ASC')
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentQuestionsRepository.create(data);
        return await this.writeReplicaAssessmentQuestionsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentQuestionsRepository.metadata);
        return await this.writeReplicaAssessmentQuestionsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentHaQuestionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentQuestionsRepository.delete(condition);
    }
    async updateOrder(data: any, req: Request) {
        let i = 0;
        for(let id of data.order) {
            await this.writeReplicaAssessmentQuestionsRepository.createQueryBuilder('healthassessment')
                .update(AssessmentHaQuestionsEntity)
                .set({order: ++i})
                .where({id})
                .execute();
            this.activityLogService.create({id: id, order: 0}, {order: i}, tableConstant.HEALTH_ASSESSMENT.TBL_HA_QUESTIONS, req.tokenUser?.id);
        }
        }

    async bulkUpdate(
        idField: string,
        data: Array<{[key: string]: any}>
    ) {
        try {
            if (!data || data.length === 0) return { affected: 0 };

            const ids = data.map(item => item[idField]);
            const sampleItem = data[0];
            const updateFields = Object.keys(sampleItem).filter(key => key !== idField);

            const queryBuilder = this.writeReplicaAssessmentQuestionsRepository.createQueryBuilder()
                .update(AssessmentHaQuestionsEntity);

            const setObject: any = {};

            updateFields.forEach(field => {
                const caseWhen = data.map(item =>
                    `WHEN ${idField} = ${item[idField]} THEN '${item[field]}'`
                ).join(' ');

                setObject[field] = () => `CASE ${caseWhen} ELSE ${field} END`;
            });

            return await queryBuilder
                .set(setObject)
                .where(`${idField} IN (:...ids)`, { ids })
                .execute();
        } catch (error) {
            throw new Error(`Failed to bulkUpdate: ${error}`);
        }
    }
}