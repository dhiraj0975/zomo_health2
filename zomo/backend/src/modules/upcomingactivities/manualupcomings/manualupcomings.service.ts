import { appConstant, CommonArrayService, CommonFileService, UcaManualUpComingsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class ManualUpcomingsService {
    constructor(
        @InjectRepository(UcaManualUpComingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUcaManualUpComingsRepository: Repository<UcaManualUpComingsEntity>,
        @InjectRepository(UcaManualUpComingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUcaManualUpComingsRepository: Repository<UcaManualUpComingsEntity>,
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
                : 'manual.created_date';
        var queryResult = await this.readReplicaUcaManualUpComingsRepository.createQueryBuilder('manual')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaUcaManualUpComingsRepository.create(data);
        return await this.writeReplicaUcaManualUpComingsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUcaManualUpComingsRepository.metadata);
        return await this.writeReplicaUcaManualUpComingsRepository.createQueryBuilder('manualupcomings')
            .update(UcaManualUpComingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaUcaManualUpComingsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUcaManualUpComingsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUcaManualUpComingsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
