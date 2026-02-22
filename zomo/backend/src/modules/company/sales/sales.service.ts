import { appConstant, CommonArrayService, CommonFileService, CompanySalesEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class SalesService {
    constructor(
        @InjectRepository(CompanySalesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanySalesRepository: Repository<CompanySalesEntity>,
        @InjectRepository(CompanySalesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanySalesRepository: Repository<CompanySalesEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
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
                : 'companySales.id';
        const queryResult = await this.readReplicaCompanySalesRepository.createQueryBuilder('companySales')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any,fields: any = ['companySales', 
        'company.id',
        'company.company_name',
        'company.street_address',
        'company.state',
        'company.city',
        'company.country',
        'company.zip',
        'company.created',
        'company_contract.industry',
        'company_contract.broker',
        'company_contract.package',
        ]) {
        return await this.readReplicaCompanySalesRepository.createQueryBuilder('companySales')
        .leftJoinAndMapOne(
            'companySales.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = companySales.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
            'companySales.company_contract',
            tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
            'company_contract',
            `company_contract.org_id = companySales.org_id`,
        )
        .where(condition)
        .select(fields)
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['companySales', 
        'company.id',
        'company.company_name',
        'company.street_address',
        'company.state',
        'company.city',
        'company.country',
        'company.zip',
        'company.created',
        'company_contract.industry',
        'company_contract.broker',
        'company_contract.package',
        ]) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCompanySalesRepository.createQueryBuilder('companySales')
        .leftJoinAndMapOne(
            'companySales.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = companySales.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
            'companySales.company_contract',
            tableConstant.COMPANIES.TBL_COMPANY_CONTRACT,
            'company_contract',
            `company_contract.org_id = companySales.org_id`,
        )
        .where(condition)
        .select(fields)
        .orderBy(`companySales.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCompanySalesRepository.create(data);
        return await this.writeReplicaCompanySalesRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCompanySalesRepository.metadata);
        return await this.writeReplicaCompanySalesRepository.createQueryBuilder('companySales')
            .update(CompanySalesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaCompanySalesRepository.delete(condition);
    }
}