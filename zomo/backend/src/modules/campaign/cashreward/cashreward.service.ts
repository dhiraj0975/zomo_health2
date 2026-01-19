import { appConstant, CashRewardEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from '../input';
@Injectable()
export class CashRewardService {
    constructor(
        @InjectRepository(CashRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCampaignChallengeRepository: Repository<CashRewardEntity>,
        @InjectRepository(CashRewardEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCampaignChallengeRepository: Repository<CashRewardEntity>,
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
                : 'cashreward.id';
        const queryResult = await this.readReplicaCampaignChallengeRepository.createQueryBuilder('cashreward')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaCampaignChallengeRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCampaignChallengeRepository.find({
            where: condition,
            select: ['id', 'reward_id', 'order_id', 'cust_name'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCampaignChallengeRepository.create(data);
        return await this.writeReplicaCampaignChallengeRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCampaignChallengeRepository.metadata);
        return await this.writeReplicaCampaignChallengeRepository.createQueryBuilder('cashreward')
            .update(CashRewardEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
