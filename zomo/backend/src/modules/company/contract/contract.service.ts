import { appConstant, CommonArrayService, CommonFileService, CompanyContractEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class ContractService {
    constructor(
        @InjectRepository(CompanyContractEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyContractRepository: Repository<CompanyContractEntity>,
        @InjectRepository(CompanyContractEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanyContractRepository: Repository<CompanyContractEntity>,
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
                : 'companyContract.id';
        const queryResult = await this.readReplicaCompanyContractRepository.createQueryBuilder('companyContract')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaCompanyContractRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCompanyContractRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCompanyContractRepository.create(data);
        return await this.writeReplicaCompanyContractRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCompanyContractRepository.metadata);
        return await this.writeReplicaCompanyContractRepository.createQueryBuilder('companyContract')
            .update(CompanyContractEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaCompanyContractRepository.delete(condition);
    }
}