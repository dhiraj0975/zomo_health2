import { appConstant, CommonArrayService, CommonFileService, QuickLinkFolderOrgListsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class QuickLinkFolderOrgListsService {
    constructor(
        @InjectRepository(QuickLinkFolderOrgListsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkFolderOrgListsRepository: Repository<QuickLinkFolderOrgListsEntity>,
        @InjectRepository(QuickLinkFolderOrgListsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuickLinkFolderOrgListsRepository: Repository<QuickLinkFolderOrgListsEntity>,
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
                ? `fol.${paginationParam.order_by}`
                : 'fol.created';
        var queryResult = await this.readReplicaQuickLinkFolderOrgListsRepository.createQueryBuilder('fol')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaQuickLinkFolderOrgListsRepository.create(data);
        return await this.writeReplicaQuickLinkFolderOrgListsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuickLinkFolderOrgListsRepository.metadata);
        return await this.writeReplicaQuickLinkFolderOrgListsRepository.createQueryBuilder('fol')
            .update(QuickLinkFolderOrgListsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuickLinkFolderOrgListsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkFolderOrgListsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkFolderOrgListsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
