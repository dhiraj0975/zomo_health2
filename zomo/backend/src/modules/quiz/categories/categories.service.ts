import { appConstant, CommonArrayService, CommonFileService, QuizCategoriesEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class QuizCategoriesService {
    constructor(
        @InjectRepository(QuizCategoriesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizCategoriesRepository: Repository<QuizCategoriesEntity>,
        @InjectRepository(QuizCategoriesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizCategoriesRepository: Repository<QuizCategoriesEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
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
                : 'qc.added_date';
        var queryResult = await this.readReplicaQuizCategoriesRepository.createQueryBuilder('qc')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaQuizCategoriesRepository.create(data);
        return await this.writeReplicaQuizCategoriesRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizCategoriesRepository.metadata);
        return await this.writeReplicaQuizCategoriesRepository.createQueryBuilder('qc')
            .update(QuizCategoriesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizCategoriesRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizCategoriesRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizCategoriesRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
