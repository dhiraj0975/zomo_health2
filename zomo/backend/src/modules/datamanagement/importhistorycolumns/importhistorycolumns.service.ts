import { appConstant, CommonArrayService, CommonFileService, DataManagementImportHistoryColumnsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithFileOrganizationInput } from '../input';
@Injectable()
export class ImportHistoryColumnsService {
    constructor(
        @InjectRepository(DataManagementImportHistoryColumnsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaimportHistoryColumnsRepository: Repository<DataManagementImportHistoryColumnsEntity>,
        @InjectRepository(DataManagementImportHistoryColumnsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaimportHistoryColumnsRepository: Repository<DataManagementImportHistoryColumnsEntity>,
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
        const queryResult = await this.readReplicaimportHistoryColumnsRepository.createQueryBuilder('document')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaimportHistoryColumnsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaimportHistoryColumnsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaimportHistoryColumnsRepository.create(data);
        return await this.writeReplicaimportHistoryColumnsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaimportHistoryColumnsRepository.metadata);
        return await this.writeReplicaimportHistoryColumnsRepository.createQueryBuilder('document')
            .update(DataManagementImportHistoryColumnsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaimportHistoryColumnsRepository.delete(condition);
    }
}