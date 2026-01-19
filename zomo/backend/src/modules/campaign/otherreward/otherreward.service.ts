import { appConstant, CommonArrayService, CommonFileService, OtherRewardEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from '../input';
@Injectable()
export class OtherRewardService {
    constructor(
        @InjectRepository(OtherRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignOtherRewardRepository: Repository<OtherRewardEntity>,
        @InjectRepository(OtherRewardEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignOtherRewardRepository: Repository<OtherRewardEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithCampaignInput) {
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
                : 'otherreward.id';
        const queryResult = await this.readReplicaCampaignOtherRewardRepository.createQueryBuilder('otherreward')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaCampaignOtherRewardRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCampaignOtherRewardRepository.find({
            where: condition,
            select: ['id', 'reward_id', 'order_id', 'cust_name'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCampaignOtherRewardRepository.create(data);
        return await this.writeReplicaCampaignOtherRewardRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCampaignOtherRewardRepository.metadata);
        return await this.writeReplicaCampaignOtherRewardRepository.createQueryBuilder('otherreward')
            .update(OtherRewardEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
