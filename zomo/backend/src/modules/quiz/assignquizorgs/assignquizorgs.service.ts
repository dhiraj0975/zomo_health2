import { appConstant, CommonArrayService, CommonFileService, QuizAssignQuizOrgEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class QuizAssignQuizOrgService {
    constructor(
        @InjectRepository(QuizAssignQuizOrgEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizAssignQuizOrgRepository: Repository<QuizAssignQuizOrgEntity>,
        @InjectRepository(QuizAssignQuizOrgEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizAssignQuizOrgRepository: Repository<QuizAssignQuizOrgEntity>,
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
                ? paginationParam.order_by
                : 'aqo.created';
        let queryResult: any = await this.readReplicaQuizAssignQuizOrgRepository.createQueryBuilder('aqo')
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZZES)) {
            queryResult = queryResult.innerJoinAndMapOne(
                'aqo.quiz',
                tableConstant.QUIZ.TBL_QZ_QUIZZES,
                'quiz',
                `quiz.id = aqo.quiz_id AND quiz.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.innerJoinAndMapOne(
                'aqo.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.code = aqo.organization_id AND company.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_CATEGORIES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'aqo.qc',
                tableConstant.QUIZ.TBL_QZ_CATEGORIES,
                'qc',
                `qc.id = quiz.cat_id`,
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZ_CLICKS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'aqo.qqc',
                tableConstant.QUIZ.TBL_QZ_QUIZ_CLICKS,
                'qqc',
                `qqc.qz_assign_id = aqo.id AND qqc.user_id = '${paginationParam.user_id}'`,
            )
        }
        queryResult = queryResult.where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip);
        queryResult = await queryResult.getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async paginateWebinarList(fields: any[] = [], condition: any, paginationParam: PaginateWithCompanyInput, groupBy: string = null) {
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
                : 'aqo.created';
        let queryResult: any = await this.readReplicaQuizAssignQuizOrgRepository.createQueryBuilder('aqo')
            .innerJoinAndMapOne(
                'aqo.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.code = aqo.organization_id AND company.status != '2'`,
            );
        queryResult = queryResult.where(condition)
            .select('aqo.id');
        let totalResults = queryResult
        queryResult = queryResult.select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip);
            
        if (groupBy) {
            queryResult = queryResult.groupBy(groupBy);
            totalResults = totalResults.groupBy(groupBy);
        }
        const total = await totalResults.getRawMany();
        queryResult = await queryResult.getMany();
        const result = queryResult;
        return this.commonArrayService.paginationResponse(result, total.length || 0, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaQuizAssignQuizOrgRepository.create(data);
        return await this.writeReplicaQuizAssignQuizOrgRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizAssignQuizOrgRepository.metadata);
        return await this.writeReplicaQuizAssignQuizOrgRepository.createQueryBuilder('aqo')
            .update(QuizAssignQuizOrgEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizAssignQuizOrgRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizAssignQuizOrgRepository.createQueryBuilder('aqo')
        .leftJoinAndMapOne(
            'aqo.quiz',
            tableConstant.QUIZ.TBL_QZ_QUIZZES,
            'quiz',
            `quiz.id = aqo.quiz_id AND quiz.status = 1`,
          )
          .leftJoinAndMapOne(
            'aqo.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.code = aqo.organization_id AND company.status = 1`,
          )
            .where(condition)
            .orderBy(`aqo.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
    }
    async orgQuizListRecord(fields: any[],condition: any, orderBy: any = null,tableData: any[] = [],postData: any = null) {
        if (!orderBy) {
            orderBy = { 'quiz.id': 'ASC' };
        }
        let queryResult: any = await this.readReplicaQuizAssignQuizOrgRepository.createQueryBuilder('aqo')
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZZES)) {
            queryResult = queryResult.innerJoinAndMapOne(
                'aqo.quiz',
                tableConstant.QUIZ.TBL_QZ_QUIZZES,
                'quiz',
                `quiz.id = aqo.quiz_id AND quiz.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.innerJoinAndMapOne(
                'aqo.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.code = aqo.organization_id AND company.status = '1'`,
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_CATEGORIES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'aqo.qc',
                tableConstant.QUIZ.TBL_QZ_CATEGORIES,
                'qc',
                `qc.id = quiz.cat_id`,
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZ_CLICKS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'aqo.qqc',
                tableConstant.QUIZ.TBL_QZ_QUIZ_CLICKS,
                'qqc',
                `qqc.qz_assign_id = aqo.id AND qqc.user_id = '${postData?.user_id}' AND qqc.status = '1'`,
            )
        }
        queryResult = await queryResult.where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return queryResult;
    }
    async getQuizDetailsForCampaign(quizId: number, membershipCode: string): Promise<any> {
        try {
            const queryResult = await this.readReplicaQuizAssignQuizOrgRepository
                .createQueryBuilder('aqo')
                .innerJoinAndMapOne(
                    'aqo.quiz',
                    tableConstant.QUIZ.TBL_QZ_QUIZZES,
                    'quiz',
                    'quiz.id = aqo.quiz_id'
                )
                .where('aqo.quiz_id = :quizId', { quizId })
                .andWhere('aqo.organization_id = :membershipCode', { membershipCode })
                .select([
                    'TRIM(aqo.start_date) as StartDate',
                    'TRIM(aqo.end_date) as EndDate',
                    'TRIM(quiz.quiz_name) as QuizName'
                ])
                .getRawOne();

            return queryResult;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
