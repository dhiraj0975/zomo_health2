import { appConstant, CommonArrayService, CommonFileService, QuizQuizzesEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithCompanyInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class QuizQuizzesService {
    constructor(
        @InjectRepository(QuizQuizzesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizQuizzesRepository: Repository<QuizQuizzesEntity>,
        @InjectRepository(QuizQuizzesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizQuizzesRepository: Repository<QuizQuizzesEntity>,
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
                ? paginationParam.order_by
                : 'qs.id';
        const queryResult = await this.readReplicaQuizQuizzesRepository.createQueryBuilder('qs')       
            .where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaQuizQuizzesRepository.create(data);
        return await this.writeReplicaQuizQuizzesRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizQuizzesRepository.metadata);
        return await this.writeReplicaQuizQuizzesRepository.createQueryBuilder('q')
            .update(QuizQuizzesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizQuizzesRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaQuizQuizzesRepository.createQueryBuilder('qs')
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_CATEGORIES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'qs.category',
                tableConstant.QUIZ.TBL_QZ_CATEGORIES,
                'category',
                `category.id = qs.cat_id AND category.status = 1`,
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'qs.aqo',
                tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG,
                'aqo',
                `aqo.quiz_id = qs.id`,
            )
        }
        queryResult = await queryResult.where(condition)
            .orderBy(`qs.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
        return queryResult;
    }
    async listRecord(fields: any, condition: any, orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any= this.readReplicaQuizQuizzesRepository.createQueryBuilder('qz')
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'qz.aqo',
                tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG,
                'aqo',
                `aqo.quiz_id = qz.id`,
            )
        }
        queryResult = await queryResult.select(fields).where(condition)
            .orderBy(`qz.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return queryResult;
    }
    async findOneQuizAllRecord(fields: any = ['qz'], condition: any, orderBy: any = null, tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaQuizQuizzesRepository.createQueryBuilder('qz')
            .leftJoinAndMapMany(
                'qz.qd',
                tableConstant.QUIZ.TBL_QZ_QUIZ_DETAILS,
                'qd',
                `qd.quiz_id = qz.id AND qd.status != '2'`
            )
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_TF_QUESTIONS)) {
            queryResult = await queryResult.leftJoinAndMapOne(
                'qd.tf',
                tableConstant.QUIZ.TBL_QZ_TF_QUESTIONS,
                'tf',
                `qd.id = tf.question_id AND tf.status != '2'`
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_MULTIPLE_CHOICE_QUESTIONS)) {
            queryResult = await queryResult.leftJoinAndMapOne(
                'qd.mc',
                tableConstant.QUIZ.TBL_QZ_MULTIPLE_CHOICE_QUESTIONS,
                'mc',
                `qd.id = mc.question_id AND mc.status != '2'`
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_MULTIPLE_RESPONSE_QUESTIONS)) {
            queryResult = await queryResult.leftJoinAndMapOne(
                'qd.mr',
                tableConstant.QUIZ.TBL_QZ_MULTIPLE_RESPONSE_QUESTIONS,
                'mr',
                `qd.id = mr.question_id AND mr.status != '2'`
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_MATCHING_DROPDOWN_QUESTIONS)) {
            queryResult = await queryResult.leftJoinAndMapMany(
                'qd.mdd',
                tableConstant.QUIZ.TBL_QZ_MATCHING_DROPDOWN_QUESTIONS,
                'mdd',
                `qd.id = mdd.question_id AND mdd.status != '2'`
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_HOTSPOT_QUESTIONS)) {
            queryResult = await queryResult.leftJoinAndMapOne(
                'qd.hp',
                tableConstant.QUIZ.TBL_QZ_HOTSPOT_QUESTIONS,
                'hp',
                `qd.id = hp.question_id AND hp.status != '2'`
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_FILLUP_QUESTIONS)) {
            queryResult = await queryResult.leftJoinAndMapMany(
                'qd.fib',
                tableConstant.QUIZ.TBL_QZ_FILLUP_QUESTIONS,
                'fib',
                `qd.id = fib.question_id AND fib.status != '2'`
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_MATCHING_DRAGDROP_QUESTIONS)) {
            queryResult = await queryResult.leftJoinAndMapMany(
                'qd.qdd',
                tableConstant.QUIZ.TBL_QZ_MATCHING_DRAGDROP_QUESTIONS,
                'qdd',
                `qd.id = qdd.question_id AND qdd.status != '2'`
            )
        }
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_MULTIPLE_QUESTIONS)) {
            queryResult = await queryResult.leftJoinAndMapMany(
                'qd.mq',
                tableConstant.QUIZ.TBL_QZ_MULTIPLE_QUESTIONS,
                'mq',
                `qd.id = mq.question_id AND mq.status != '2'`
            )
        }
        queryResult = queryResult
            .where(condition)
            .select(fields)
            .orderBy(`qd.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            
        queryResult = await queryResult.getOne();
        return queryResult
    }
}
