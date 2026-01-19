import { appConstant, CommonArrayService, CommonFileService, InsuranceRewardEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCampaignInput } from '../input';
@Injectable()
export class InsuranceRewardService {
    constructor(
        @InjectRepository(InsuranceRewardEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaInsuranceRewardRepository: Repository<InsuranceRewardEntity>,
        @InjectRepository(InsuranceRewardEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaInsuranceRewardRepository: Repository<InsuranceRewardEntity>,
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
                : 'insurancereward.id';
        const queryResult = await this.readReplicaInsuranceRewardRepository.createQueryBuilder('insurancereward')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaInsuranceRewardRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['insurancereward.id','insurancereward.cust_name'], isJoin: any = 'no') {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaInsuranceRewardRepository.createQueryBuilder('insurancereward');
        if(isJoin == 'yes') {
            query = query
            .leftJoinAndMapOne(
                'insurancereward.insurancePlan',
                tableConstant.CAMPAIGN.TBL_INSURANCE_PLAN,
                'insurancePlan',
                `insurancePlan.id = insurancereward.ins_id AND insurancePlan.status = 1`,
            );
        }
        query = query.where(condition)
        .select(fields);
        query = query.orderBy(`insurancereward.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        return await query.getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaInsuranceRewardRepository.create(data);
        return await this.writeReplicaInsuranceRewardRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaInsuranceRewardRepository.metadata);
        return await this.writeReplicaInsuranceRewardRepository.createQueryBuilder('insurancereward')
            .update(InsuranceRewardEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
