import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    ImportUserRequestEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class ImportUserRequestService extends BaseService<ImportUserRequestEntity>{
    constructor(
        @InjectRepository(ImportUserRequestEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaImportUserRequestRepository: Repository<ImportUserRequestEntity>,
        @InjectRepository(ImportUserRequestEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaImportUserRequestRepository: Repository<ImportUserRequestEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaImportUserRequestRepository, writeReplicaImportUserRequestRepository ,'importuserrequest', commonArrayService);
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
                ? `importUser.${paginationParam.order_by}`
                : 'importUser.created_date';
        const queryResult = await this.readReplicaImportUserRequestRepository.createQueryBuilder('importUser')
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
        const savedResult = this.writeReplicaImportUserRequestRepository.create(data);
        return await this.writeReplicaImportUserRequestRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaImportUserRequestRepository.delete(condition);
    }
    async findOne(condition: any, orderBy = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaImportUserRequestRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaImportUserRequestRepository.find({
            where: condition,
            order: orderBy,
        });
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaImportUserRequestRepository.metadata);
        return await this.writeReplicaImportUserRequestRepository.createQueryBuilder('importUser')
            .update(ImportUserRequestEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
