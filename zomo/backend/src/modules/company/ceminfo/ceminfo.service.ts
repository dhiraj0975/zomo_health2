import { appConstant, CommonArrayService, CommonFileService, CompanyCEMInfoEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class CEMInfoService {
    constructor(
        @InjectRepository(CompanyCEMInfoEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacompanyCEMInfoRepository: Repository<CompanyCEMInfoEntity>,
        @InjectRepository(CompanyCEMInfoEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacompanyCEMInfoRepository: Repository<CompanyCEMInfoEntity>,
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
                : 'companyCEMInfo.id';
        const queryResult = await this.readReplicacompanyCEMInfoRepository.createQueryBuilder('companyCEMInfo')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicacompanyCEMInfoRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacompanyCEMInfoRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicacompanyCEMInfoRepository.create(data);
        return await this.writeReplicacompanyCEMInfoRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacompanyCEMInfoRepository.metadata);
        return await this.writeReplicacompanyCEMInfoRepository.createQueryBuilder('companyCEMInfo')
            .update(CompanyCEMInfoEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicacompanyCEMInfoRepository.delete(condition);
    }
}