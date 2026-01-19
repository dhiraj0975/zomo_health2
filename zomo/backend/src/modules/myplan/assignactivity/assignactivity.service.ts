import { appConstant, CommonFileService, MyPlanAssignActivityEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class MyPlanAssignActivityService {
    constructor(
        @InjectRepository(MyPlanAssignActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanAssignActivityRepository: Repository<MyPlanAssignActivityEntity>,
        @InjectRepository(MyPlanAssignActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanAssignActivityRepository: Repository<MyPlanAssignActivityEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaMyPlanAssignActivityRepository.create(data);
        return await this.writeReplicaMyPlanAssignActivityRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanAssignActivityRepository.metadata);
        return await this.writeReplicaMyPlanAssignActivityRepository.createQueryBuilder('maa')
            .update(MyPlanAssignActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanAssignActivityRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null): Promise<MyPlanAssignActivityEntity> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaMyPlanAssignActivityRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any,fields: any[] = [], orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaMyPlanAssignActivityRepository.createQueryBuilder('maa')
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ACTIVITY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'maa.ma',
                tableConstant.MY_PLAN.TBL_MP_ACTIVITY,
                'ma',
                `ma.block_id = maa.block_id AND maa.activity_id = ma.id`,
            )
        }
        if (tableData.includes(tableConstant.ACTIVITIES.TBL_ACTIVITIES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ac.id = ma.activity_id`,
            ).leftJoinAndMapOne(
                'ma.acAge',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'acAge',
                `acAge.id = ma.org_activity_id AND ma.module_id=3 AND acAge.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EVENTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ee',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'ee',
                `ee.id = ma.org_activity_id AND ma.module_id = 1 AND ma.is_category = 0 AND ee.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.eec',
                tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
                'eec',
                `eec.id = ma.org_activity_id AND ma.module_id = 1 AND ma.is_category = 1 AND eec.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.har',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                'har',
                `har.id = ma.org_activity_id AND ma.module_id = 2 AND har.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.csc',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                'csc',
                `csc.id = ma.org_activity_id AND ma.module_id = 4 AND csc.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.QUICK_LINK.TBL_QUICK_LINK)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ql',
                tableConstant.QUICK_LINK.TBL_QUICK_LINK,
                'ql',
                `ql.id = ma.org_activity_id AND ma.module_id = 5 AND ql.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZZES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.qz',
                tableConstant.QUIZ.TBL_QZ_QUIZZES,
                'qz',
                `qz.id = ma.org_activity_id AND ma.module_id = 6 AND qz.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ep',
                tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,
                'ep',
                `ep.id = ma.org_activity_id OR ep.id = ma.post_id AND ma.module_id = 9 AND ep.status = '1'`,
            )
        }
        queryResult = queryResult.select(fields).where(condition).orderBy(`maa.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        if (tableData.includes(tableConstant.MY_PLAN.TBL_MP_ACTIVITY)) {
            queryResult = queryResult.addOrderBy(`ma.order_id`, 'ASC')
        }
        queryResult = await queryResult.getMany();
        return queryResult
    }
}
