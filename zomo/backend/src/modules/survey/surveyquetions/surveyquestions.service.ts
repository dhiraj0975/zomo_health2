import { appConstant, CommonArrayService, CommonFileService, SurveyQuestionsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationSurveyInput } from "../../../input";
@Injectable()
export class SurveyQuestionsService {
    constructor(
        @InjectRepository(SurveyQuestionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSurveyRepository: Repository<SurveyQuestionsEntity>,
        @InjectRepository(SurveyQuestionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSurveyRepository: Repository<SurveyQuestionsEntity>,
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
                ? paginationParam.order_by
                : 'survey.added_date';
        const queryResult = await this.readReplicaSurveyRepository.createQueryBuilder('survey')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSurveyRepository.metadata);
        return await this.writeReplicaSurveyRepository.createQueryBuilder('survey')
            .update(SurveyQuestionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaSurveyRepository.create(data);
        return await this.writeReplicaSurveyRepository.save(savedResult);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async delete(condition) {
        await this.writeReplicaSurveyRepository.delete(condition);
    }
    async questionData(condition, feild = [], orgId) {
        return await this.readReplicaSurveyRepository.createQueryBuilder('questions')
            .innerJoinAndMapOne(
                'questions.Surveypopup',
                tableConstant.SURVEY.TBL_C_SURVEY_POPUP,
                'Surveypopup',
                `Surveypopup.id=questions.popup_id AND Surveypopup.status=1 AND Surveypopup.org_id = ${orgId}`,
            )
            .leftJoinAndMapMany(
                'questions.SurveyAnswer',
                tableConstant.SURVEY.TBL_C_SURVEY_ANSWERS,
                'SurveyAnswer',
                `SurveyAnswer.q_id = questions.id AND SurveyAnswer.status != 2`,
            )
            .where(condition)
            .select(feild)
            .orderBy('questions.id', 'ASC')
            .getMany();
    }
}
