import { appConstant, CommonArrayService, CommonFileService, DataManagementDocumentEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithFileOrganizationInput } from '../input';
@Injectable()
export class DocumentService {
    constructor(
        @InjectRepository(DataManagementDocumentEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicadocumentRepository: Repository<DataManagementDocumentEntity>,
        @InjectRepository(DataManagementDocumentEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicadocumentRepository: Repository<DataManagementDocumentEntity>,
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
        const queryResult = await this.readReplicadocumentRepository.createQueryBuilder('document')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicadocumentRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicadocumentRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicadocumentRepository.create(data);
        return await this.writeReplicadocumentRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicadocumentRepository.metadata);
        return await this.writeReplicadocumentRepository.createQueryBuilder('document')
            .update(DataManagementDocumentEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicadocumentRepository.delete(condition);
    }
}