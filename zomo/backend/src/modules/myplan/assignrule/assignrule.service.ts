import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    MyPlanAssignRuleEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MyPlanAssignRuleService extends BaseService<MyPlanAssignRuleEntity> {
    constructor(
        @InjectRepository(MyPlanAssignRuleEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanAssignRuleRepository: Repository<MyPlanAssignRuleEntity>,
        @InjectRepository(MyPlanAssignRuleEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanAssignRuleRepository: Repository<MyPlanAssignRuleEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaMyPlanAssignRuleRepository,writeReplicaMyPlanAssignRuleRepository,'assignRule',commonArrayService);
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
                ? `ar.${paginationParam.order_by}`
                : 'ar.id';
        let queryResult: any = await this.readReplicaMyPlanAssignRuleRepository.createQueryBuilder('ar')
            .leftJoinAndMapOne(
                'ar.br',
                tableConstant.MY_PLAN.TBL_MP_BUSINESS_RULE,
                'br',
                `br.id = ar.rule_id`,
            ).where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanAssignRuleRepository.create(data);
        return await this.writeReplicaMyPlanAssignRuleRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanAssignRuleRepository.metadata);
        return await this.writeReplicaMyPlanAssignRuleRepository.createQueryBuilder('mar')
            .update(MyPlanAssignRuleEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanAssignRuleRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanAssignRuleRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
