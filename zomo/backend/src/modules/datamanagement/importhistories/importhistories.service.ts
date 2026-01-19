import { appConstant, CommonArrayService, CommonFileService, DataManagementImportHistoriesEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithFileOrganizationInput } from '../input';
@Injectable()
export class ImportHistoriesService {
    constructor(
        @InjectRepository(DataManagementImportHistoriesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaimportHistoriesRepository: Repository<DataManagementImportHistoriesEntity>,
        @InjectRepository(DataManagementImportHistoriesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaimportHistoriesRepository: Repository<DataManagementImportHistoriesEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithFileOrganizationInput) {
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
                : 'document.id';
        const queryResult = await this.readReplicaimportHistoriesRepository.createQueryBuilder('document')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaimportHistoriesRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaimportHistoriesRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaimportHistoriesRepository.create(data);
        return await this.writeReplicaimportHistoriesRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaimportHistoriesRepository.metadata);
        return await this.writeReplicaimportHistoriesRepository.createQueryBuilder('document')
            .update(DataManagementImportHistoriesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaimportHistoriesRepository.delete(condition);
    }
}