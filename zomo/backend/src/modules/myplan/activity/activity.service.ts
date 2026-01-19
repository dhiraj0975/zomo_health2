import { appConstant, CommonArrayService, CommonFileService, MyPlanActivityEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class MyPlanActivityService {
    constructor(
        @InjectRepository(MyPlanActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMyPlanActivityRepository: Repository<MyPlanActivityEntity>,
        @InjectRepository(MyPlanActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaMyPlanActivityRepository: Repository<MyPlanActivityEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(fields: any[] = [],condition: any, paginationParam: PaginateWithCompanyInput) {
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
                ? `ma.${paginationParam.order_by}`
                : 'ma.id';
        let queryResult: any = this.readReplicaMyPlanActivityRepository.createQueryBuilder('ma')
            .leftJoinAndMapOne(
                'ma.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ac.id = ma.activity_id AND ac.status != '2'`,
            )
            .leftJoinAndMapOne(
                'ma.acAge',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'acAge',
                `acAge.id = ma.org_activity_id AND ma.module_id = 3 AND acAge.status != '2'`,
            ).leftJoinAndMapOne(
                'ma.ee',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'ee',
                `ee.id = ma.org_activity_id AND ma.module_id = 1 AND ma.is_category = 0`,
            ).leftJoinAndMapOne(
                'ma.eec',
                tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
                'eec',
                `eec.id = ma.org_activity_id AND ma.module_id = 1 AND ma.is_category = 1 AND eec.status != '2'`,
            ).leftJoinAndMapOne(
                'ma.har',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                'har',
                `har.id = ma.org_activity_id AND ma.module_id = 2`,
            ).leftJoinAndMapOne(
                'ma.csc',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                'csc',
                `csc.id = ma.org_activity_id AND ma.module_id = 4`,
            ).leftJoinAndMapOne(
                'ma.ql',
                tableConstant.QUICK_LINK.TBL_QUICK_LINK,
                'ql',
                `ql.id = ma.org_activity_id AND ma.module_id = 5`,
            ).leftJoinAndMapOne(
                'ma.qz',
                tableConstant.QUIZ.TBL_QZ_QUIZZES,
                'qz',
                `qz.id = ma.org_activity_id AND ma.module_id = 6`,
            ).leftJoinAndMapOne(
                'ma.ep',
                tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,
                'ep',
                `ep.id = ma.org_activity_id OR ep.id = ma.post_id AND ma.module_id = 9`,
            )
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
        const savedResult = this.writeReplicaMyPlanActivityRepository.create(data);
        return await this.writeReplicaMyPlanActivityRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaMyPlanActivityRepository.metadata);
        return await this.writeReplicaMyPlanActivityRepository.createQueryBuilder('ma')
            .update(MyPlanActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaMyPlanActivityRepository.delete(condition);
    }
    async findOne(condition: any,orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaMyPlanActivityRepository.createQueryBuilder('ma')
        if (tableData.includes(tableConstant.ACTIVITIES.TBL_ACTIVITIES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ac.id = ma.activity_id OR (ac.id = ma.org_activity_id AND ma.module_id = 3)`,
            )
        }
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = ma.organization_id`,
            )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EVENTS)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'ma.ee',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'ee',
                `FIND_IN_SET(ee.id, REPLACE(ma.org_activity_id, 'EVC', '')) > 0 AND ma.module_id = 1 AND ee.status != '2'`,
            )
            /*is_category condition remove*/
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY)) {
            queryResult = queryResult.leftJoinAndMapMany(
                'ma.eec',
                tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
                'eec',
                `FIND_IN_SET(eec.id, REPLACE(ma.org_activity_id, 'EVC', '')) > 0 AND ma.module_id = 1 AND eec.status != '2'`,
            )
            /*is_category condition remove*/
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.har',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                'har',
                `har.id = ma.org_activity_id AND ma.module_id = 2 AND har.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.csc',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                'csc',
                `csc.id = ma.org_activity_id AND ma.module_id = 4 AND csc.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.QUICK_LINK.TBL_QUICK_LINK)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ql',
                tableConstant.QUICK_LINK.TBL_QUICK_LINK,
                'ql',
                `ql.id = ma.org_activity_id AND ma.module_id = 5 AND ql.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZZES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.qz',
                tableConstant.QUIZ.TBL_QZ_QUIZZES,
                'qz',
                `qz.id = ma.org_activity_id AND ma.module_id = 6 AND qz.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ep',
                tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,
                'ep',
                `ep.id = ma.org_activity_id OR ep.id = ma.post_id AND ma.module_id = 9 AND ep.status != '2'`,
            )
        }
        queryResult = await queryResult.where(condition).orderBy(`ma.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]).getOne();
        return queryResult;
    }
    async listRecord(fields: any, condition: any, orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaMyPlanActivityRepository.createQueryBuilder('ma')
        if (tableData.includes(tableConstant.ACTIVITIES.TBL_ACTIVITIES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ac',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'ac',
                `ac.id = ma.activity_id AND ma.activity_id > 0`,
            )
        }
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = ma.organization_id`,
            )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EVENTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ee',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'ee',
                `ee.id = ma.org_activity_id AND ma.module_id = 1 AND ma.is_category = 0 AND ee.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.eec',
                tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
                'eec',
                `eec.id = ma.org_activity_id AND ma.module_id = 1 AND ma.is_category = 1 AND eec.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.har',
                tableConstant.HEALTH_ASSESSMENT.TBL_HA_ASSESSMENT_RESULTS,
                'har',
                `har.id = ma.org_activity_id AND ma.module_id = 2 AND har.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.csc',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                'csc',
                `csc.id = ma.org_activity_id AND ma.module_id = 4 AND csc.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.QUICK_LINK.TBL_QUICK_LINK)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ql',
                tableConstant.QUICK_LINK.TBL_QUICK_LINK,
                'ql',
                `ql.id = ma.org_activity_id AND ma.module_id = 5 AND ql.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZZES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.qz',
                tableConstant.QUIZ.TBL_QZ_QUIZZES,
                'qz',
                `qz.id = ma.org_activity_id AND ma.module_id = 6 AND qz.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'ma.ep',
                tableConstant.EMOTIONAL_WELLBEING.TBL_EM_POST,
                'ep',
                `ep.id = ma.org_activity_id OR ep.id = ma.post_id AND ma.module_id = 9 AND ep.status != '2'`,
            )
        }
        queryResult = await queryResult.select(fields).where(condition).orderBy(`ma.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]).getMany();
        return queryResult;
    }
}
