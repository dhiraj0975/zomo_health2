import { appConstant, CommonArrayService, CommonFileService, MarketingCareerEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithUserInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class MarketingCareerService {
    constructor(
        @InjectRepository(MarketingCareerEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMarketingCareerRepository: Repository<MarketingCareerEntity>,
        @InjectRepository(MarketingCareerEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMarketingCareerRepository: Repository<MarketingCareerEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {    
        data = await this.commonFileService.filterDataByEntityColumns(data, this.readReplicaMarketingCareerRepository.metadata);
        return await this.writeReplicaMarketingCareerRepository.save(data);        
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMarketingCareerRepository.metadata);
        return await this.writeReplicaMarketingCareerRepository.createQueryBuilder('cs')
            .update(MarketingCareerEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMarketingCareerRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMarketingCareerRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async createUpdate(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.readReplicaMarketingCareerRepository.metadata);
        let recordDetails = await this.readReplicaMarketingCareerRepository.findOne({ where: condition });
        if (recordDetails) {
            await this.writeReplicaMarketingCareerRepository.update(condition, data);
            return { ...recordDetails, update: 1 };
        } else {
            return await this.writeReplicaMarketingCareerRepository.save(data);
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
                ? `marketingcareer.${paginationParam.order_by}`
                : 'marketingcareer.id';
        const queryResult = await this.readReplicaMarketingCareerRepository.createQueryBuilder('marketingcareer')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;        
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
}
