import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    MyPlanPlansEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MyPlanPlansService extends BaseService<MyPlanPlansEntity> {
    constructor(
        @InjectRepository(MyPlanPlansEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanPlansRepository: Repository<MyPlanPlansEntity>,
        @InjectRepository(MyPlanPlansEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanPlansRepository: Repository<MyPlanPlansEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaMyPlanPlansRepository, writeReplicaMyPlanPlansRepository, 'plans', commonArrayService );
    }
    async paginateList(fields: any[] = [],condition: any, paginationParam: PaginateWithCompanyInput,tableData: any[] = []) {
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
                ? `mp.${paginationParam.order_by}`
                : 'mp.id';
        let queryResult: any = await this.readReplicaMyPlanPlansRepository.createQueryBuilder('mp')
        if (tableData.includes(tableConstant.TBL_USERS)) {
            queryResult = await queryResult.leftJoinAndMapOne(
                'mp.users',
                tableConstant.TBL_USERS,
                'users',
                `users.id = mp.created_by`
            )
        }
        queryResult = await queryResult.select(fields)
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanPlansRepository.create(data);
        return await this.writeReplicaMyPlanPlansRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanPlansRepository.metadata);
        return await this.writeReplicaMyPlanPlansRepository.createQueryBuilder('mp')
            .update(MyPlanPlansEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanPlansRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null,fields: any[] = []): Promise<MyPlanPlansEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanPlansRepository.findOne({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any[] = [],condition: any, orderBy: any = null,tableData: any[] = [],data: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaMyPlanPlansRepository.createQueryBuilder('mp')
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN)) {
            queryResult = queryResult.innerJoinAndMapOne(
                'mp.map',
                tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN,
                'map',
                `map.plan_id = mp.id`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ASSIGN_RULE)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'mp.mar',
                tableConstant.MY_PLAN.TBL_MP_ASSIGN_RULE,
                'mar',
                `mp.id = mar.plan_id AND mar.org_id = '${data?.org_id}' AND mar.status = '1'`
            ).leftJoinAndMapOne(
                'mar.br',
                tableConstant.MY_PLAN.TBL_MP_BUSINESS_RULE,
                'br',
                `br.id = mar.rule_id AND br.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_JOIN_USER_PLAN)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'mp.jup',
                tableConstant.MY_PLAN.TBL_MP_JOIN_USER_PLAN,
                'jup',
                `jup.plan_id = mp.id AND jup.user_id = '${data?.user_id}'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_BLOCKS)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'mp.mb',
                tableConstant.MY_PLAN.TBL_MP_BLOCKS,
                'mb',
                `mb.plan_id = mp.id AND mb.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'mb.mab',
                tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK,
                'mab',
                `mab.block_id = mb.id AND mab.org_id = '${data?.org_id}' AND mab.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_COMPLETE_BLOCK)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'mb.mcb',
                tableConstant.MY_PLAN.TBL_MP_COMPLETE_BLOCK,
                'mcb',
                `mcb.block_id = mb.id AND mcb.user_id = '${data?.user_id}'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ACTIVITY)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'mb.ma',
                tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
                'ma',
                `ma.block_id = mb.id AND ma.status = '1' AND (ma.activity_id != '-1' OR ma.organization_id = '${data?.org_id}')`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.maa',
                tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,
                'maa',
                `maa.activity_id = ma.id AND maa.status = '1' AND maa.org_id = '${data?.org_id}'`,
            )
        }
        if (tableData.includes(tableConstant.ACTIVITIES.TBL_ACTIVITIES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ma.activity_id = ac.id`,
            ).leftJoinAndMapOne(
                'ma.acAge',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'acAge',
                `ma.org_activity_id = acAge.id`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.mca',
                tableConstant.MY_PLAN.TBL_MP_COMPLETE_ACTIVITY,
                'mca',
                `mca.custom_id = ma.id AND mca.user_id = '${data?.user_id}'`,
            )
        }
        queryResult = queryResult.select(fields).where(condition).orderBy(`mp.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ASSIGN_RULE)) {
            queryResult = queryResult.addOrderBy('mar.id','ASC')
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_BLOCKS)) {
            queryResult = queryResult.addOrderBy('mb.order_id','ASC')
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ACTIVITY)) {
            queryResult = queryResult.addOrderBy('ma.order_id','ASC')
        }
        queryResult = await queryResult.getMany();
        return queryResult
    }
}
