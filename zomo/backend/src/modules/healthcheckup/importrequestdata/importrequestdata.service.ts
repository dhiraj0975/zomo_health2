import { appConstant, CommonArrayService, CommonFileService, ImportRequestDataEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class ImportRequestDataService {
    constructor(
        @InjectRepository(ImportRequestDataEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaImportRequestDataRepository: Repository<ImportRequestDataEntity>,
        @InjectRepository(ImportRequestDataEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaImportRequestDataRepository: Repository<ImportRequestDataEntity>,
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
                ? `importUser.${paginationParam.order_by}`
                : 'importUser.created_date';
        const queryResult = await this.readReplicaImportRequestDataRepository.createQueryBuilder('importUser')
        .leftJoinAndMapOne(
            'importUser.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = importUser.org_id AND company.status = 1`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaImportRequestDataRepository.create(data);
        return await this.writeReplicaImportRequestDataRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaImportRequestDataRepository.delete(condition);
    }
    async findOne(condition: any, orderBy = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaImportRequestDataRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaImportRequestDataRepository.find({
            where: condition,
            order: orderBy,
        });
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.readReplicaImportRequestDataRepository.metadata);
        return await this.writeReplicaImportRequestDataRepository.createQueryBuilder('importUser')
            .update(ImportRequestDataEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
