import { appConstant, CommonArrayService, CommonFileService, MyPlanAssignPlanEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MyPlanAssignPlanService {
    constructor(
        @InjectRepository(MyPlanAssignPlanEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanAssignPlanRepository: Repository<MyPlanAssignPlanEntity>,
        @InjectRepository(MyPlanAssignPlanEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanAssignPlanRepository: Repository<MyPlanAssignPlanEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput,tableData: any[] = []) {
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
                ? `${paginationParam.order_by}`
                : 'ap.id';
        let queryResult: any = await this.readReplicaMyPlanAssignPlanRepository.createQueryBuilder('ap')
            .innerJoinAndMapOne(
                'ap.mp',
                tableConstant.MY_PLAN.TBL_MP_PLANS,
                'mp',
                `mp.id = ap.plan_id`,
            )
        if (tableData.includes(tableConstant.TBL_USERS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'mp.user',
                tableConstant.TBL_USERS,
                'user',
                `mp.created_by = user.id`,
            )
        }
        queryResult = await queryResult
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanAssignPlanRepository.create(data);
        return await this.writeReplicaMyPlanAssignPlanRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanAssignPlanRepository.metadata);
        return await this.writeReplicaMyPlanAssignPlanRepository.createQueryBuilder('map')
            .update(MyPlanAssignPlanEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanAssignPlanRepository.delete(condition);
    }
    async findOne(fields: any[] = [],condition: any, orderBy: any = null): Promise<MyPlanAssignPlanEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanAssignPlanRepository.findOne({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any[] = [],condition: any, orderBy: any = null,tableData: any[] = [],postData: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaMyPlanAssignPlanRepository.createQueryBuilder('ap')
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_PLANS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ap.mp',
                tableConstant.MY_PLAN.TBL_MP_PLANS,
                'mp',
                `mp.id = ap.plan_id AND mp.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_BLOCKS)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'ap.mb',
                tableConstant.MY_PLAN.TBL_MP_BLOCKS,
                'mb',
                `mb.plan_id = ap.plan_id AND mb.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'mb.mab',
                tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK,
                'mab',
                `mab.block_id = mb.id AND mab.plan_id = mb.plan_id AND mab.org_id = ap.org_id AND mab.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ACTIVITY)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'mb.ma',
                tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
                'ma',
                `ma.block_id = mb.id AND ma.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'mab.maa',
                tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,
                'maa',
                `ap.plan_id = maa.plan_id AND maa.block_id = mab.block_id AND maa.org_id = mab.org_id AND maa.activity_id = ma.id AND maa.status = '1' `,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ACTIVITY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ac.id = ma.activity_id OR (ac.id = ma.org_activity_id AND ma.module_id = 3)`,
            )
            .leftJoinAndMapOne(
                'ma.ee',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'ee',
                `ee.id = ma.org_activity_id AND ma.module_id = 1 AND ma.is_category = 0 AND ee.status != '2'`,
            ).leftJoinAndMapOne(
                'ma.eec',
                tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
                'eec',
                `eec.id = ma.org_activity_id AND ma.module_id = 1 AND ma.is_category = 1 AND eec.status != '2'`,
            ).leftJoinAndMapOne(
                'ma.har',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                'har',
                `har.id = ma.org_activity_id AND ma.module_id = 2 AND har.status != '2'`,
            ).leftJoinAndMapOne(
                'ma.csc',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                'csc',
                `csc.id = ma.org_activity_id AND ma.module_id = 4 AND csc.status != '2'`,
            ).leftJoinAndMapOne(
                'ma.ql',
                tableConstant.QUICK_LINK.TBL_QUICK_LINK,
                'ql',
                `ql.id = ma.org_activity_id AND ma.module_id = 5 AND ql.status != '2'`,
            ).leftJoinAndMapOne(
                'ma.qz',
                tableConstant.QUIZ.TBL_QZ_QUIZZES,
                'qz',
                `qz.id = ma.org_activity_id AND ma.module_id = 6 AND qz.status != '2'`,
            ).leftJoinAndMapOne(
                'ma.ep',
                tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,
                'ep',
                `ep.id = ma.org_activity_id OR ep.id = ma.post_id AND ma.module_id = 9 AND ep.status != '2'`,
            )
        }
        queryResult = await queryResult.select(fields)
            .where(condition)
            .orderBy(`ap.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_BLOCKS)) {
            queryResult = await queryResult.addOrderBy('mb.order_id','ASC')
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ACTIVITY)) {
            queryResult = await queryResult.addOrderBy('ma.order_id','ASC')
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ASSIGN_BLOCK)) {
            queryResult = await queryResult.addOrderBy('mab.id','ASC')
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY)) {
            queryResult = await queryResult.addOrderBy('maa.id','ASC')
        }
        queryResult = await queryResult.getMany();
        return queryResult
    }
}
