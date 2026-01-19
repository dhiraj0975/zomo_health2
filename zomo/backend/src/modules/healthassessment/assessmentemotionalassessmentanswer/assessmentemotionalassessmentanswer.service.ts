import {
    appConstant,
    AssessmentEmotionalAssessmentAnswerEntity,
    AssessmentHaQuestionsEntity, BaseService,
    CommonArrayService,
    CommonFileService
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentEmotionalAssessmentAnswerService extends BaseService<AssessmentEmotionalAssessmentAnswerEntity> {
    constructor(
        @InjectRepository(AssessmentEmotionalAssessmentAnswerEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentEmotionalAssessmentAnswerRepository: Repository<AssessmentEmotionalAssessmentAnswerEntity>,
        @InjectRepository(AssessmentEmotionalAssessmentAnswerEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentEmotionalAssessmentAnswerRepository: Repository<AssessmentEmotionalAssessmentAnswerEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaAssessmentEmotionalAssessmentAnswerRepository, writeReplicaAssessmentEmotionalAssessmentAnswerRepository, 'emotionalAssessmentsAnswer', commonArrayService );
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
        const queryResult = await this.readReplicaAssessmentEmotionalAssessmentAnswerRepository.createQueryBuilder('healthassessment')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaAssessmentEmotionalAssessmentAnswerRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentEmotionalAssessmentAnswerRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentEmotionalAssessmentAnswerRepository.create(data);
        return await this.writeReplicaAssessmentEmotionalAssessmentAnswerRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentEmotionalAssessmentAnswerRepository.metadata);
        return await this.writeReplicaAssessmentEmotionalAssessmentAnswerRepository.createQueryBuilder('healthassessment')
            .update(AssessmentEmotionalAssessmentAnswerEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentEmotionalAssessmentAnswerRepository.delete(condition);
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

            const queryBuilder = this.writeReplicaAssessmentEmotionalAssessmentAnswerRepository.createQueryBuilder()
                .update(AssessmentEmotionalAssessmentAnswerEntity);

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