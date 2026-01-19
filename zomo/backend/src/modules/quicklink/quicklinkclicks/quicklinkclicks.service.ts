import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    QuickLinkClicksEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class QuickLinkClicksService extends BaseService<QuickLinkClicksEntity> {
    constructor(
        @InjectRepository(QuickLinkClicksEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkClicksRepository: Repository<QuickLinkClicksEntity>,
        @InjectRepository(QuickLinkClicksEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuickLinkClicksRepository: Repository<QuickLinkClicksEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaQuickLinkClicksRepository,writeReplicaQuickLinkClicksRepository,'quickLinkClicks',commonArrayService);
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
                : 'clicks.created_date';
        var queryResult = await this.readReplicaQuickLinkClicksRepository.createQueryBuilder('clicks')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaQuickLinkClicksRepository.create(data);
        return await this.writeReplicaQuickLinkClicksRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuickLinkClicksRepository.metadata);
        return await this.writeReplicaQuickLinkClicksRepository.createQueryBuilder('clicks')
            .update(QuickLinkClicksEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuickLinkClicksRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkClicksRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any = ['clicks.*'], condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { 'clicks.id': 'DESC' };
        }
        return await this.readReplicaQuickLinkClicksRepository.createQueryBuilder('clicks')
        .where(condition)
        .select(fields)
        .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getRawMany();
    }
}