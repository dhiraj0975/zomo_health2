import {
    appConstant,
    AssessmentResultsEntity,
    BaseService,
    CommonArrayService,
    CommonFileService
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentResultsService extends BaseService<AssessmentResultsEntity> {
    constructor(
        @InjectRepository(AssessmentResultsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentResultsRepository: Repository<AssessmentResultsEntity>,
        @InjectRepository(AssessmentResultsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentResultsRepository: Repository<AssessmentResultsEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaAssessmentResultsRepository, writeReplicaAssessmentResultsRepository, 'assessmentResults', commonArrayService );
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
        const queryResult = await this.readReplicaAssessmentResultsRepository.createQueryBuilder('healthassessment')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, field: any[] = [], orderBy: any = null): Promise<AssessmentResultsEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentResultsRepository.findOne({
            where: condition,
            select: field,
            order: orderBy,
        });
    }
    async listRecord(condition: any, field: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentResultsRepository.find({
            where: condition,
            select: field,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentResultsRepository.create(data);
        return await this.writeReplicaAssessmentResultsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentResultsRepository.metadata);
        return await this.writeReplicaAssessmentResultsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentResultsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentResultsRepository.delete(condition);
    }
}