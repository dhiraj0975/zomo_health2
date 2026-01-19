import { appConstant, AssessmentTextsEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from "express";
import { Repository } from 'typeorm';
import { PaginateWithHealthAssessmentInput } from '../../../input';
@Injectable()
export class AssessmentTextsService {
    constructor(
        @InjectRepository(AssessmentTextsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentTextsRepository: Repository<AssessmentTextsEntity>,
        @InjectRepository(AssessmentTextsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentTextsRepository: Repository<AssessmentTextsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(
        condition: any,
        paginationParam: PaginateWithHealthAssessmentInput,
        req: Request = null,
    ) {
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
        const queryResult = await this.readReplicaAssessmentTextsRepository
            .createQueryBuilder('healthassessment')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaAssessmentTextsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentTextsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const record = await this.writeReplicaAssessmentTextsRepository.findOne({
            where: { ass_sec_id: data.ass_sec_id },
        });
        if (record.id) {
            data['id'] = record['id'];
        } 
        return await this.writeReplicaAssessmentTextsRepository.save(data);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentTextsRepository.metadata);
        return await this.writeReplicaAssessmentTextsRepository
            .createQueryBuilder('healthassessment')
            .update(AssessmentTextsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentTextsRepository.delete(condition);
    }
}
