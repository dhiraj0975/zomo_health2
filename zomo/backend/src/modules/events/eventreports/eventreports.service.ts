import { appConstant, CommonArrayService, CommonFileService, RequestEventReportsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class RequestEventReportsService {
    constructor(
        @InjectRepository(RequestEventReportsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventRequestReportsRepository: Repository<RequestEventReportsEntity>,
        @InjectRepository(RequestEventReportsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventRequestReportsRepository: Repository<RequestEventReportsEntity>,
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
                : 'err.created';
        var queryResult = await this.readReplicaEventRequestReportsRepository.createQueryBuilder('err')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaEventRequestReportsRepository.create(data);
        return await this.writeReplicaEventRequestReportsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventRequestReportsRepository.metadata);
        return await this.writeReplicaEventRequestReportsRepository.createQueryBuilder('err')
            .update(RequestEventReportsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaEventRequestReportsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaEventRequestReportsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
