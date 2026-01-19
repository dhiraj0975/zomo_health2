import { appConstant, CommonArrayService, CommonFileService, QuizDetailsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class QuizDetailsService {
    constructor(
        @InjectRepository(QuizDetailsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizDetailsRepository: Repository<QuizDetailsEntity>,
        @InjectRepository(QuizDetailsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizDetailsRepository: Repository<QuizDetailsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaQuizDetailsRepository.create(data);
        return await this.writeReplicaQuizDetailsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizDetailsRepository.metadata);
        return await this.writeReplicaQuizDetailsRepository.createQueryBuilder('qd')
            .update(QuizDetailsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuizDetailsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuizDetailsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null,tableData: any[] = [],postData: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaQuizDetailsRepository.createQueryBuilder('qd')
            if (tableData.includes(tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG)) {
                queryResult = await queryResult.leftJoinAndMapOne(
                    'qd.aqo',
                    tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG,
                    'aqo',
                    `qd.quiz_id = aqo.quiz_id AND aqo.organization_id = '${postData?.membership_code}'`
                )
            }
            if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZ_USER_DETAILS)) {
                let userCon = ``;
                if (postData?.user_id) {
                    userCon = `AND qud.user_id = '${postData?.user_id}'`
                }
                queryResult = await queryResult.leftJoinAndMapOne(
                    'qd.qud',
                    tableConstant.QUIZ.TBL_QZ_QUIZ_USER_DETAILS,
                    'qud',
                    `qd.quiz_id = qud.quiz_id AND qd.id = qud.question_id ${userCon}`
                ).addOrderBy('qud.id', 'DESC')
            }
            if (tableData.includes(tableConstant.QUIZ.TBL_QZ_USER_DETAILS)) {
                queryResult = await queryResult.leftJoinAndMapOne(
                    'qd.ud',
                    tableConstant.QUIZ.TBL_QZ_USER_DETAILS,
                    'ud',
                    `qd.quiz_id = ud.quiz_id AND ud.membership_code = '${postData?.membership_code}' AND ud.user_id = '${postData?.user_id}' AND ud.completed = 'yes'`
                ).addOrderBy('ud.id', 'DESC')
            }
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
        queryResult = await queryResult.where(condition).orderBy(`qd.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZ_USER_DETAILS)) {
                queryResult = await queryResult.addOrderBy('qud.id', 'DESC')
            }
            if (tableData.length > 0) {
                queryResult = await queryResult.getMany();
            } else {
                queryResult = await queryResult.select(fields).getRawMany();
            }
        return queryResult
    }
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
                ? `qd.${paginationParam.order_by}`
                : 'qd.id';
        let queryResult: any = await this.readReplicaQuizDetailsRepository.createQueryBuilder('qd')
            if (tableData.includes(tableConstant.QUIZ.TBL_QZ_QUIZZES)) {
                queryResult = await queryResult.leftJoinAndMapOne(
                    'qd.qz',
                    tableConstant.QUIZ.TBL_QZ_QUIZZES,
                    'qz',
                    `qz.id = qd.quiz_id`
                )
            }
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
        queryResult = await queryResult.where(condition).orderBy(orderBy, <any>order);
        if (!paginationParam.section_id) {
            queryResult = await queryResult.take(paginateObj.take).skip(paginateObj.skip).getManyAndCount();
            const [result, total] = queryResult;
            return this.commonArrayService.paginationResponse(result, total, paginateObj);
        } else {
            queryResult = await queryResult.getMany();
            return queryResult;
        }
    }
}
