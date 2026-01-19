import { appConstant, CommonArrayService, CommonFileService, MarketingEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithUserInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class MarketingService {
    constructor(
        @InjectRepository(MarketingEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMarketingRepository: Repository<MarketingEntity>,
        @InjectRepository(MarketingEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMarketingRepository: Repository<MarketingEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaMarketingRepository.create(data);
        return await this.writeReplicaMarketingRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMarketingRepository.metadata);
        return await this.writeReplicaMarketingRepository.createQueryBuilder('cs')
            .update(MarketingEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMarketingRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMarketingRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async createUpdate(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.readReplicaMarketingRepository.metadata);
        let recordDetails = await this.readReplicaMarketingRepository.findOne({ where: condition });
        if (recordDetails) {
            await this.writeReplicaMarketingRepository.update(condition, data);
            return { ...recordDetails, update: 1 };
        } else {
            return await this.writeReplicaMarketingRepository.save(data);
        }
    }
    async paginateList(condition: any, paginationParam: PaginateWithUserInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit || 10,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'marketing.id';
        const queryResult = await this.readReplicaMarketingRepository.createQueryBuilder('marketing')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;        
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
}
