import { appConstant, CommonArrayService, CommonFileService, HealthRequestEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {FindManyOptions, FindOneOptions, FindOptions, FindOptionsOrder, FindOptionsWhere, Repository} from 'typeorm';
import {PaginationRequestInput} from "./inputs";
@Injectable()
export class HealthRequestService {
    constructor(
        @InjectRepository(HealthRequestEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthRequestRepository: Repository<HealthRequestEntity>,
        @InjectRepository(HealthRequestEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaHealthRequestRepository: Repository<HealthRequestEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginationRequestInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order: string =
            paginationParam && paginationParam.order
                ? paginationParam.order.toUpperCase()
                : 'DESC';
        const orderBy: string =
            paginationParam && paginationParam.order_by
                ? `hr.${paginationParam.order_by}`
                : 'hr.created_date';
        let queryResult = await this.readReplicaHealthRequestRepository.createQueryBuilder('hr')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaHealthRequestRepository.create(data);
        return await this.writeReplicaHealthRequestRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaHealthRequestRepository.metadata);
        return await this.writeReplicaHealthRequestRepository.createQueryBuilder('hr')
            .update(HealthRequestEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaHealthRequestRepository.delete(condition);
    }
    async findOne(condition: FindOptionsWhere<HealthRequestEntity> | FindOptionsWhere<HealthRequestEntity>[] = {}, fields: (keyof HealthRequestEntity)[] = [], orderBy: FindOptionsOrder<HealthRequestEntity> = { id: 'DESC' }): Promise<HealthRequestEntity | null> {
        try {
            const findOptions: FindOneOptions<HealthRequestEntity> = {
                ...(fields && fields.length > 0 && { select: fields }),
                where: condition,
                order: orderBy,
            };
            return await this.readReplicaHealthRequestRepository.findOne(findOptions);
        } catch (error) {
            throw new Error('Failed to fetch record');
        }
    }
    async listRecord(fields: (keyof HealthRequestEntity)[] = [], condition: FindOptionsWhere<HealthRequestEntity> | FindOptionsWhere<HealthRequestEntity>[] = {}, orderBy: FindOptionsOrder<HealthRequestEntity> = { id: 'DESC' },): Promise<HealthRequestEntity[]> {
        try {
            const findOptions: FindManyOptions<HealthRequestEntity> = {
                ...(fields.length && { select: fields }),
                where: condition,
                order: orderBy,
            };
            return await this.readReplicaHealthRequestRepository.find(findOptions);
        } catch (error) {
            throw new Error('Failed to fetch record');
        }
    }
}
