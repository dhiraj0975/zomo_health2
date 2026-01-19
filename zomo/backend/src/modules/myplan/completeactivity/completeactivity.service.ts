import { appConstant, CommonArrayService, CommonFileService, MyPlanCompleteActivityEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MyPlanCompleteActivityService {
    constructor(
        @InjectRepository(MyPlanCompleteActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanCompleteActivityRepository: Repository<MyPlanCompleteActivityEntity>,
        @InjectRepository(MyPlanCompleteActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanCompleteActivityRepository: Repository<MyPlanCompleteActivityEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
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
                ? `${paginationParam.order_by}`
                : 'ca.id';
        let queryResult: any = this.readReplicaMyPlanCompleteActivityRepository.createQueryBuilder('ca')
        let result, total;
        if (paginationParam.flag_status == '1') {
                queryResult = queryResult.leftJoinAndMapOne(
                    'ca.users',
                    tableConstant.TBL_USERS,
                    'users',
                    `users.id = ca.user_id`,
                ).leftJoinAndMapOne(
                    'ca.ac',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'ac',
                    `ac.id = ca.activity_id`,
                ).leftJoinAndMapOne(
                    'ca.mac',
                    tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
                    'mac',
                    `mac.id = ca.custom_id`,
                ).leftJoinAndMapOne(
                    'ca.aac',
                    tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,
                    'aac',
                    `aac.activity_id = mac.id`,
                ).leftJoinAndMapOne(
                    'ca.cc',
                    tableConstant.COACH.TBL_CO_COACHES,
                    'cc',
                    `cc.org_id = aac.org_id`,
                ).leftJoinAndMapOne(
                    'ca.mb',
                    tableConstant.MY_PLAN.TBL_MP_BLOCKS,
                    'mb',
                    `mb.id = mac.block_id`,
                ).leftJoinAndMapOne(
                    'ca.mp',
                    tableConstant.MY_PLAN.TBL_MP_PLANS,
                    'mp',
                    `mp.id = mb.plan_id`,
                )
            queryResult = await queryResult.where(condition).select(fields).groupBy('ca.id').orderBy(orderBy, <any>order).take(paginateObj.take).skip(paginateObj.skip).getManyAndCount();
            [result, total] = queryResult;
        } else if (paginationParam.flag_status == '2') {
                queryResult = queryResult.leftJoinAndMapOne(
                    'ca.users',
                    tableConstant.TBL_USERS,
                    'users',
                    `users.id = ca.user_id`,
                ).leftJoinAndMapOne(
                    'ca.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.code = users.membership_code`,
                )
            let recordData = await queryResult.where(condition).select(fields).groupBy('users.code').orderBy(orderBy, <any>order).take(paginateObj.take).skip(paginateObj.skip).getManyAndCount();
            total = await queryResult.where(condition).select("COUNT(DISTINCT users.code)", "count").groupBy('users.code').getRawMany();
            [result, total] = [recordData[0] ,total.length]
        } else if (paginationParam.flag_status == '3') {
                queryResult = queryResult.leftJoinAndMapOne(
                    'ca.mac',
                    tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
                    'mac',
                    `mac.id = ca.custom_id`,
                ).leftJoinAndMapOne(
                    'mac.aac',
                    tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,
                    'aac',
                    `aac.activity_id = mac.id AND aac.org_id = ${paginationParam.org_id}`,
                ).leftJoinAndMapOne(
                    'mac.mb',
                    tableConstant.MY_PLAN.TBL_MP_BLOCKS,
                    'mb',
                    `mb.id = mac.block_id`,
                ).leftJoinAndMapOne(
                    'mb.mp',
                    tableConstant.MY_PLAN.TBL_MP_PLANS,
                    'mp',
                    `mp.id = mb.plan_id`,
                ).leftJoinAndMapOne(
                    'mp.map',
                    tableConstant.MY_PLAN.TBL_MP_ASSIGN_PLAN,
                    'map',
                    `map.plan_id = mp.id AND map.org_id = ${paginationParam.org_id}`,
                ).leftJoinAndMapOne(
                    'mac.ev',
                    tableConstant.EVENTS.TBL_EV_EVENTS,
                    'ev',
                    `ev.id = mac.org_activity_id AND mac.module_id = 1 AND mac.is_category = 0 AND ev.status != '2'`,
                ).leftJoinAndMapOne(
                    'mac.eec',
                    tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
                    'eec',
                    `eec.id = mac.org_activity_id AND mac.module_id = 1 AND mac.is_category = 1 AND eec.status != '2'`,
                ).leftJoinAndMapOne(
                    'mac.har',
                    tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                    'har',
                    `har.id = mac.org_activity_id AND mac.module_id = 2 AND har.status != '2'`,
                ).leftJoinAndMapOne(
                    'mac.ac',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'ac',
                    `ac.id = ca.activity_id OR (ac.id = mac.org_activity_id AND mac.module_id = 3)`,
                ).leftJoinAndMapOne(
                    'mac.csc',
                    tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                    'csc',
                    `csc.id = mac.org_activity_id AND mac.module_id = 4 AND csc.status != '2'`,
                ).leftJoinAndMapOne(
                    'mac.ql',
                    tableConstant.QUICK_LINK.TBL_QUICK_LINK,
                    'ql',
                    `ql.id = mac.org_activity_id AND mac.module_id = 5 AND ql.status != '2'`,
                ).leftJoinAndMapOne(
                    'mac.qz',
                    tableConstant.QUIZ.TBL_QZ_QUIZZES,
                    'qz',
                    `qz.id = mac.org_activity_id AND mac.module_id = 6 AND qz.status != '2'`,
                ).leftJoinAndMapOne(
                    'mac.ep',
                    tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,
                    'ep',
                    `ep.id = mac.org_activity_id OR ep.id = mac.post_id AND mac.module_id = 9 AND ep.status != '2'`,
                )
            queryResult = await queryResult.where(condition).select(fields).groupBy('ca.id').orderBy(orderBy, <any>order).take(paginateObj.take).addOrderBy('mac.order_id','ASC').skip(paginateObj.skip).getManyAndCount();
            [result, total] = queryResult;
        }else if (paginationParam.flag_status == '4') {
                queryResult = queryResult.leftJoinAndMapOne(
                    'ca.ac',
                    tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                    'ac',
                    `ac.id = ca.activity_id`,
                ).leftJoinAndMapOne(
                    'ca.ma',
                    tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
                    'ma',
                    `ma.id = ca.custom_id`,
                ).leftJoinAndMapOne(
                    'ma.maa',
                    tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,
                    'maa',
                    `maa.activity_id = ma.id`,
                ).leftJoinAndMapOne(
                    'ca.users',
                    tableConstant.TBL_USERS,
                    'users',
                    `users.id = ca.user_id`,
                ).leftJoinAndMapOne(
                    'ma.mb',
                    tableConstant.MY_PLAN.TBL_MP_BLOCKS,
                    'mb',
                    `mb.id = ma.block_id`,
                ).leftJoinAndMapOne(
                    'mb.mp',
                    tableConstant.MY_PLAN.TBL_MP_PLANS,
                    'mp',
                    `mp.id = mb.plan_id`,
                )
            queryResult = await queryResult.where(condition).select(fields).groupBy('ca.id').orderBy(orderBy, <any>order).take(paginateObj.take).skip(paginateObj.skip).getManyAndCount();
            [result, total] = queryResult;
        }
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanCompleteActivityRepository.create(data);
        return await this.writeReplicaMyPlanCompleteActivityRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanCompleteActivityRepository.metadata);
        return await this.writeReplicaMyPlanCompleteActivityRepository.createQueryBuilder('cap')
            .update(MyPlanCompleteActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanCompleteActivityRepository.delete(condition);
    }
    async findOne(fields: any[] = [],condition: any, orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaMyPlanCompleteActivityRepository.createQueryBuilder('ca')
        if (tableData.includes(tableConstant.ACTIVITIES.TBL_ACTIVITIES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ca.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ac.id = ca.activity_id`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ACTIVITY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ca.mac',
                tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
                'mac',
                `mac.id = ca.custom_id AND mac.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ca.aac',
                tableConstant.MY_PLAN.TBL_MP_ASSIGN_ACTIVITY,
                'aac',
                `aac.activity_id = mac.id AND aac.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.TBL_USERS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ca.users',
                tableConstant.TBL_USERS,
                'users',
                `users.id = ca.user_id AND users.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.COACH.TBL_CO_COACHES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ca.cc',
                tableConstant.COACH.TBL_CO_COACHES,
                'cc',
                `cc.org_id = aac.org_id AND cc.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_BLOCKS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ca.mb',
                tableConstant.MY_PLAN.TBL_MP_BLOCKS,
                'mb',
                `mb.id = mac.block_id AND mb.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_PLANS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ca.mp',
                tableConstant.MY_PLAN.TBL_MP_PLANS,
                'mp',
                `mp.id = mb.plan_id AND mp.status != '2'`,
            )
        }
        queryResult = await queryResult.select(fields)
            .where(condition)
            .orderBy(`ca.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
        return queryResult
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['ca.*'],) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return this.readReplicaMyPlanCompleteActivityRepository.createQueryBuilder('ca')
        .leftJoinAndMapOne(
            'ca.activity',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'activity',
            `activity.id = ca.activity_id`
        )
        .leftJoinAndMapOne(
            'ca.user',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'user',
            `user.id = ca.user_id`
        )
        .where(condition)
        .select(fields)
        .orderBy(`ca.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
}
