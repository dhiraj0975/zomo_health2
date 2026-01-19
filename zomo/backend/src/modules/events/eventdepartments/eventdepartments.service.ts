import { appConstant, CommonArrayService, CommonFileService, EventDepartmentsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class EventDepartmentsService {
    constructor(
        @InjectRepository(EventDepartmentsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventDepartmentsRepository: Repository<EventDepartmentsEntity>,
        @InjectRepository(EventDepartmentsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventDepartmentsRepository: Repository<EventDepartmentsEntity>,
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
                : 'ev_departments.id';
        const queryResult = await this.readReplicaEventDepartmentsRepository.createQueryBuilder('ev_departments')
            .leftJoinAndMapOne(
                'ev_departments.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = ev_departments.departments_id`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaEventDepartmentsRepository.findOne({
            where: condition,
        });
    }
    async list(condition: any) {
        return await this.readReplicaEventDepartmentsRepository.createQueryBuilder('ev_departments')
        .leftJoinAndMapOne(
            'ev_departments.department',
            tableConstant.COMPANIES.TBL_DEPARTMENT,
            'department',
            `department.id = ev_departments.departments_id`,
        )
        .where(condition)
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaEventDepartmentsRepository.create(data);
        return await this.writeReplicaEventDepartmentsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventDepartmentsRepository.metadata);
        return await this.writeReplicaEventDepartmentsRepository.createQueryBuilder('ev_departments')
            .update(EventDepartmentsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaEventDepartmentsRepository.delete(condition);
    }
}
