import {appConstant, BaseService, CommonArrayService, CommonFileService, QuizSectionEntity} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class QuizSectionService extends BaseService<QuizSectionEntity> {
    constructor(
        @InjectRepository(QuizSectionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizSectionRepository: Repository<QuizSectionEntity>,
        @InjectRepository(QuizSectionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizSectionRepository: Repository<QuizSectionEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaQuizSectionRepository, writeReplicaQuizSectionRepository, 'quizSection', commonArrayService );
    }
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
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
                : 'qs.created_date';
        var queryResult = await this.readReplicaQuizSectionRepository.createQueryBuilder('qs')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaQuizSectionRepository.create(data);
        return await this.writeReplicaQuizSectionRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizSectionRepository.metadata);
        return await this.writeReplicaQuizSectionRepository.createQueryBuilder('qs')
            .update(QuizSectionEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizSectionRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizSectionRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizSectionRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
}
