import { appConstant, CommonArrayService, CommonFileService, MyPlanBusinessRuleEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MyPlanBusinessRuleService {
    constructor(
        @InjectRepository(MyPlanBusinessRuleEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanBusinessRuleRepository: Repository<MyPlanBusinessRuleEntity>,
        @InjectRepository(MyPlanBusinessRuleEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanBusinessRuleRepository: Repository<MyPlanBusinessRuleEntity>,
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
                ? `br.${paginationParam.order_by}`
                : 'br.id';
        let queryResult: any = await this.readReplicaMyPlanBusinessRuleRepository.createQueryBuilder('br')
            .leftJoinAndMapOne(
                'br.events',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'events',
                `events.id = br.activity_id AND br.module_id = '1'`,
            )
            .leftJoinAndMapOne(
                'br.sc',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                'sc',
                `sc.id = br.activity_id AND br.module_id = '4'`,
            )
            .leftJoinAndMapOne(
                'br.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ac.id = br.activity_id AND br.module_id = '3'`,
            )
            .leftJoinAndMapOne(
                'br.ar',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                'ar',
                `ar.id = br.activity_id AND br.module_id = '2'`,
            )
            .leftJoinAndMapOne(
                'br.ql',
                tableConstant.QUICK_LINK.TBL_QUICK_LINK,
                'ql',
                `ql.id = br.activity_id AND br.module_id = '5'`,
            )
            .leftJoinAndMapOne(
                'br.qz',
                tableConstant.QUIZ.TBL_QZ_QUIZZES,
                'qz',
                `qz.id = br.activity_id AND br.module_id = '6'`,
            )
            .leftJoinAndMapOne(
                'br.ep',
                tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,
                'ep',
                `ep.id = br.activity_id AND br.module_id = '9'`,
            )
        if (tableData.includes(tableConstant.TBL_USERS)) {
            queryResult= queryResult.leftJoinAndMapOne(
                'br.users',
                tableConstant.TBL_USERS,
                'users',
                `users.id = br.created_by`
            )
        }
        if (tableData.includes(tableConstant.COACH.TBL_CO_COACHES)) {
            queryResult= queryResult.innerJoinAndMapOne(
                'br.co',
                tableConstant.COACH.TBL_CO_COACHES,
                'co',
                `co.org_id = br.organization_id AND co.coach_manager_id = '${paginationParam.user_id}'`
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
        const savedResult = this.writeReplicaMyPlanBusinessRuleRepository.create(data);
        return await this.writeReplicaMyPlanBusinessRuleRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanBusinessRuleRepository.metadata);
        return await this.writeReplicaMyPlanBusinessRuleRepository.createQueryBuilder('br')
            .update(MyPlanBusinessRuleEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanBusinessRuleRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanBusinessRuleRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanBusinessRuleRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
