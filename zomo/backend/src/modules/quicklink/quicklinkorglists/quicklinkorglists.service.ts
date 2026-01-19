import { appConstant, CommonArrayService, CommonFileService, QuickLinkOrgListsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class QuicklinkOrglistsService {
    constructor(
        @InjectRepository(QuickLinkOrgListsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkOrgListsRepository: Repository<QuickLinkOrgListsEntity>,
        @InjectRepository(QuickLinkOrgListsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuickLinkOrgListsRepository: Repository<QuickLinkOrgListsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(field,condition: any, paginationParam: PaginateWithCompanyInput) {
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
                : 'lists.created';
        var queryResult = await this.readReplicaQuickLinkOrgListsRepository.createQueryBuilder('lists')
            .select(field)
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaQuickLinkOrgListsRepository.create(data);
        return await this.writeReplicaQuickLinkOrgListsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuickLinkOrgListsRepository.metadata);
        return await this.writeReplicaQuickLinkOrgListsRepository.createQueryBuilder('lists')
            .update(QuickLinkOrgListsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuickLinkOrgListsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkOrgListsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkOrgListsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
