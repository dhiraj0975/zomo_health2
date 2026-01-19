import { appConstant, CommonArrayService, CommonFileService, EventLocationsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class EventLocationsService {
    constructor(
        @InjectRepository(EventLocationsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventLocationsRepository: Repository<EventLocationsEntity>,
        @InjectRepository(EventLocationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventLocationsRepository: Repository<EventLocationsEntity>,
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
                : 'e_location.created';
        var queryResult = await this.readReplicaEventLocationsRepository.createQueryBuilder('e_location')
        .leftJoinAndMapOne(
            'e_location.location',
            tableConstant.COMPANIES.TBL_LOCATION,
            'location',
            `location.id = e_location.locations_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaEventLocationsRepository.create(data);
        return await this.writeReplicaEventLocationsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventLocationsRepository.metadata);
        return await this.writeReplicaEventLocationsRepository.createQueryBuilder('e_location')
            .update(EventLocationsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaEventLocationsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaEventLocationsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        const order =
        orderBy && orderBy.order
            ? orderBy.order
            : 'DESC';
    const order_by =
        orderBy && orderBy.order_by
            ? `e_location.${orderBy.order_by}`
            : 'e_location.created';
        return await this.readReplicaEventLocationsRepository.createQueryBuilder('e_location')
        .leftJoinAndMapOne(
            'e_location.location',
            tableConstant.COMPANIES.TBL_LOCATION,
            'location',
            `location.id = e_location.locations_id`,
          )
            .where(condition)
            .orderBy(order_by, <any>order)
            .getMany();
    }
}
