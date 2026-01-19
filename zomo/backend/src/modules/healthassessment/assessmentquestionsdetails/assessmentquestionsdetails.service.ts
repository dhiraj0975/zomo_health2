import { appConstant, AssessmentQuestionsDetailsEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentQuestionsDetailsService {
    constructor(
        @InjectRepository(AssessmentQuestionsDetailsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentQuestionsDetailsRepository: Repository<AssessmentQuestionsDetailsEntity>,
        @InjectRepository(AssessmentQuestionsDetailsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentQuestionsDetailsRepository: Repository<AssessmentQuestionsDetailsEntity>,
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
        const queryResult = await this.readReplicaAssessmentQuestionsDetailsRepository.createQueryBuilder('healthassessment')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaAssessmentQuestionsDetailsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentQuestionsDetailsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentQuestionsDetailsRepository.create(data);
        return await this.writeReplicaAssessmentQuestionsDetailsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentQuestionsDetailsRepository.metadata);
        return await this.writeReplicaAssessmentQuestionsDetailsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentQuestionsDetailsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentQuestionsDetailsRepository.delete(condition);
    }
}