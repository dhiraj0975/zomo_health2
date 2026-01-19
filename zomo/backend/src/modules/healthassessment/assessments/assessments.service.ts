import {
    appConstant,
    AssessmentsEntity,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    tableConstant
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentsService  extends BaseService<AssessmentsEntity> {
    constructor(
        @InjectRepository(AssessmentsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentsRepository: Repository<AssessmentsEntity>,
        @InjectRepository(AssessmentsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentsRepository: Repository<AssessmentsEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaAssessmentsRepository,writeReplicaAssessmentsRepository,'assessment',commonArrayService);
    }
    async paginateList(condition: any, paginationParam: PaginateWithHealthAssessmentInput) {
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
                : 'healthassessment.id';
        const queryResult = await this.readReplicaAssessmentsRepository.createQueryBuilder('healthassessment')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any,field: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentsRepository.findOne({
            select: field,
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { 'healthassessment.id': 'DESC' };
        }
        return this.readReplicaAssessmentsRepository.createQueryBuilder('healthassessment')
        .leftJoinAndMapOne(
            'healthassessment.activity',
            tableConstant.ACTIVITIES.TBL_ACTIVITIES,
            'activity',
            `activity.id = healthassessment.activity_id`
        )
        .where(condition)
        .select(fields)
        .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getRawMany();
    }
    async assessmentListRecord(condition: any, orderBy: any = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { 'ha.id': 'DESC' };
        }
        return this.readReplicaAssessmentsRepository.createQueryBuilder('ha')
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentsRepository.create(data);
        return await this.writeReplicaAssessmentsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentsRepository.metadata);
        return await this.writeReplicaAssessmentsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentsRepository.delete(condition);
    }
    async HRAReset(condition: any, orderBy: any = null, select: any[] = ['healthassessment'], paginationParam: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let paginateObj = null;
        if(paginationParam){
          paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
          );
      }
        let query = this.readReplicaAssessmentsRepository.createQueryBuilder('healthassessment')
            .leftJoinAndMapOne(
                'healthassessment.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = healthassessment.user_id AND user.role_id IN(2,16)`
            )
            .leftJoinAndMapOne(
                'user.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = user.id`
            )
            .leftJoinAndMapOne(
                'user.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = user.org_id`
            )
            .leftJoinAndMapOne(
                'user.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = user.department_id`
            )
            .leftJoinAndMapOne(
                'user.location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'location',
                `location.id = user.location`
            )
            .where(condition)
            if(paginateObj){
                query = query
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .select(select)
                .orderBy(`healthassessment.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
                ;
            }
            return await query
            .getManyAndCount();
    }
}