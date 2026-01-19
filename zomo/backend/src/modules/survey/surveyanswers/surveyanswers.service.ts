import { appConstant, CommonArrayService, CommonFileService, SurveyAnswersEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationSurveyInput } from "../../../input";
@Injectable()
export class SurveyAnswersService {
    constructor(
        @InjectRepository(SurveyAnswersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSurveyAnswersRepository: Repository<SurveyAnswersEntity>,
        @InjectRepository(SurveyAnswersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSurveyAnswersRepository: Repository<SurveyAnswersEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginationSurveyInput) {
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
                ? `survey.${paginationParam.order_by}`
                : 'survey.added_date';
        const queryResult = await this.readReplicaSurveyAnswersRepository.createQueryBuilder('survey')
            .leftJoinAndMapOne(
                'survey.question',
                tableConstant.SURVEY.TBL_C_SURVEY_QUESTIONS,
                'question',
                `question.id = survey.q_id`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaSurveyAnswersRepository.create(data);
        return await this.writeReplicaSurveyAnswersRepository.save(savedResult);
    }
    async findOne(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyAnswersRepository.createQueryBuilder('survey')
        .leftJoinAndMapOne(
            'survey.question',
            tableConstant.SURVEY.TBL_C_SURVEY_QUESTIONS,
            'question',
            `question.id = survey.q_id`,
        )
        .where(condition)
        .getOne();
    }
    async delete(condition: any) {
        await this.writeReplicaSurveyAnswersRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSurveyAnswersRepository.metadata);
        return await this.writeReplicaSurveyAnswersRepository.createQueryBuilder('survey')
            .update(SurveyAnswersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyAnswersRepository.createQueryBuilder('survey')
        .leftJoinAndMapOne(
            'survey.question',
            tableConstant.SURVEY.TBL_C_SURVEY_QUESTIONS,
            'question',
            `question.id = survey.q_id`,
        )
        .where(condition)
        .select(['survey','question.id','question.org_id','question.title','question.popup_id'])
        .getMany();
    }
}
