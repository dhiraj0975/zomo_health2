import { appConstant, CommonArrayService, CommonFileService, InsurancePlanEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class InsurancePlanService {
    constructor(
        @InjectRepository(InsurancePlanEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaInsurancePlanRepository: Repository<InsurancePlanEntity>,
        @InjectRepository(InsurancePlanEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaInsurancePlanRepository: Repository<InsurancePlanEntity>,
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
                : 'insuranceplan.id';
        const queryResult = await this.readReplicaInsurancePlanRepository.createQueryBuilder('insuranceplan')
        .leftJoinAndMapOne(
            'insuranceplan.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = insuranceplan.organization_id AND company.status = 1`,
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
        return await this.readReplicaInsurancePlanRepository.createQueryBuilder('insuranceplan')
        .leftJoinAndMapOne(
            'insuranceplan.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = insuranceplan.organization_id AND company.status = 1`,
          )
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, fields:  any = ['id', 'plan_name']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaInsurancePlanRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaInsurancePlanRepository.create(data);
        return await this.writeReplicaInsurancePlanRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaInsurancePlanRepository.metadata);
        return await this.writeReplicaInsurancePlanRepository.createQueryBuilder('insuranceplan')
            .update(InsurancePlanEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
