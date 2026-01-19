import { appConstant, CommonArrayService, CommonFileService, CompanySettingsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, InsertResult, Repository, UpdateResult } from "typeorm";
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(CompanySettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicacompanySettingsRepository: Repository<CompanySettingsEntity>,
        @InjectRepository(CompanySettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicacompanySettingsRepository: Repository<CompanySettingsEntity>,
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
                : 'companySettings.id';
        const queryResult = await this.readReplicacompanySettingsRepository.createQueryBuilder('companySettings')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: FindOptionsWhere<CompanySettingsEntity>, select: any[] = []): Promise<CompanySettingsEntity | null> {
        return await this.readReplicacompanySettingsRepository.findOne({
            where: condition,
            select : select
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicacompanySettingsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any): Promise<InsertResult> {
        const savedResult = this.writeReplicacompanySettingsRepository.create(data);
        return await this.writeReplicacompanySettingsRepository.insert(savedResult);
    }
    async update(condition: string | object, data: any): Promise<UpdateResult> {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacompanySettingsRepository.metadata);
        return await this.writeReplicacompanySettingsRepository.createQueryBuilder('companySettings')
            .update(CompanySettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicacompanySettingsRepository.delete(condition);
    }
}