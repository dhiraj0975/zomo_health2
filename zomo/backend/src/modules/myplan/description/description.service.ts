import { appConstant, CommonArrayService, CommonFileService, MyPlanDescriptionEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MyPlanDescriptionService {
    constructor(
        @InjectRepository(MyPlanDescriptionEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanDescriptionRepository: Repository<MyPlanDescriptionEntity>,
        @InjectRepository(MyPlanDescriptionEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanDescriptionRepository: Repository<MyPlanDescriptionEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(fields: any[] = [],condition: any, paginationParam: PaginateWithCompanyInput,tableData: any[] = []) {
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
                ? `md.${paginationParam.order_by}`
                : 'md.id';
        let queryResult: any = await this.readReplicaMyPlanDescriptionRepository.createQueryBuilder('md')
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'md.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = md.organization_id`,
            )
        }
        if (tableData.includes(tableConstant.TBL_USERS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'md.users',
                tableConstant.TBL_USERS,
                'users',
                `users.id = md.created_by`
            )
        }
        if (tableData.includes(tableConstant.COACH.TBL_CO_COACHES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'md.co',
                tableConstant.COACH.TBL_CO_COACHES,
                'co',
                `co.org_id = md.organization_id`
            )
        }
        queryResult = await queryResult.select(fields)
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanDescriptionRepository.create(data);
        return await this.writeReplicaMyPlanDescriptionRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanDescriptionRepository.metadata);
        return await this.writeReplicaMyPlanDescriptionRepository.createQueryBuilder('d')
            .update(MyPlanDescriptionEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanDescriptionRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaMyPlanDescriptionRepository.createQueryBuilder('md')
            if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
                queryResult = queryResult.leftJoinAndMapOne(
                    'md.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = md.organization_id`,
                )
            }
        queryResult = await queryResult.where(condition)
            .orderBy(`md.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
        return queryResult;
    }
    async listRecord(condition: any,fields: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanDescriptionRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
}
