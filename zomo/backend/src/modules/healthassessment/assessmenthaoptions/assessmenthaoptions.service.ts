import { appConstant, AssessmentHaOptionsEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithHealthAssessmentInput } from "../../../input";
@Injectable()
export class AssessmentHaOptionsService {
    constructor(
        @InjectRepository(AssessmentHaOptionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssessmentHaOptionsRepository: Repository<AssessmentHaOptionsEntity>,
        @InjectRepository(AssessmentHaOptionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssessmentHaOptionsRepository: Repository<AssessmentHaOptionsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
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
        const queryResult = await this.readReplicaAssessmentHaOptionsRepository.createQueryBuilder('healthassessment')
        .leftJoinAndMapOne(
            'healthassessment.question',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_QUESTIONS,
            'question',
            `question.id = healthassessment.question_id`,
          )
        .leftJoinAndMapOne(
            'healthassessment.parent',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_OPTIONS,
            'parent',
            `parent.id = healthassessment.parent_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any,orderBy: any = null, fields: any[]= null) {
        if (!orderBy) {
            orderBy = { 'healthassessment.id': 'DESC' };
        }
        return this.readReplicaAssessmentHaOptionsRepository.createQueryBuilder('healthassessment')
        .leftJoinAndMapOne(
            'healthassessment.parent',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_OPTIONS,
            'parent',
            `parent.id = healthassessment.parent_id`,
          )
          .leftJoinAndMapOne(
            'healthassessment.question',
            tableConstant.HEALTH_ASSESSMENT.TBL_HA_QUESTIONS,
            'question',
            `question.id = healthassessment.question_id`,
          )          
          .where(condition)
          .select(fields)
          .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
          .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, select: any[]= []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssessmentHaOptionsRepository.find({
            where: condition,
            select: select,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssessmentHaOptionsRepository.create(data);
        return await this.writeReplicaAssessmentHaOptionsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssessmentHaOptionsRepository.metadata);
        return await this.writeReplicaAssessmentHaOptionsRepository.createQueryBuilder('healthassessment')
            .update(AssessmentHaOptionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssessmentHaOptionsRepository.delete(condition);
    }
}