import {
    appConstant,
    AssessmentEmotionalAssessmentResultEntity,
    BaseService,
    CommonArrayService,
    CommonFileService
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentEmotionalAssessmentResultService extends BaseService<AssessmentEmotionalAssessmentResultEntity> {
    constructor(
        @InjectRepository(AssessmentEmotionalAssessmentResultEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentEmotionalAssessmentResultRepository: Repository<AssessmentEmotionalAssessmentResultEntity>,
        @InjectRepository(AssessmentEmotionalAssessmentResultEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentEmotionalAssessmentResultRepository: Repository<AssessmentEmotionalAssessmentResultEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaAssessmentEmotionalAssessmentResultRepository, writeReplicaAssessmentEmotionalAssessmentResultRepository, 'emotionalAssessmentsResult', commonArrayService );
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
        const queryResult = await this.readReplicaAssessmentEmotionalAssessmentResultRepository.createQueryBuilder('healthassessment')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaAssessmentEmotionalAssessmentResultRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null,field: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        const queryResult = await this.readReplicaAssessmentEmotionalAssessmentResultRepository.createQueryBuilder('healthassessment')
            .where(condition)
            .select(field)
            .orderBy(`healthassessment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
        return queryResult;
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentEmotionalAssessmentResultRepository.create(data);
        return await this.writeReplicaAssessmentEmotionalAssessmentResultRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentEmotionalAssessmentResultRepository.metadata);
        return await this.writeReplicaAssessmentEmotionalAssessmentResultRepository.createQueryBuilder('healthassessment')
            .update(AssessmentEmotionalAssessmentResultEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentEmotionalAssessmentResultRepository.delete(condition);
    }
}