import { appConstant, CommonArrayService, CommonFileService, SurveyPopupEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationSurveyInput } from "../../../input";
@Injectable()
export class SurveyPopupService {
    constructor(
        @InjectRepository(SurveyPopupEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSurveyPopupRepository: Repository<SurveyPopupEntity>,
        @InjectRepository(SurveyPopupEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSurveyPopupRepository: Repository<SurveyPopupEntity>,
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
                : 'survey.created';
        const queryResult = await this.readReplicaSurveyPopupRepository.createQueryBuilder('survey')
            .leftJoinAndMapOne(
                'survey.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = survey.org_id AND company.status = 1`,
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
        const savedResult = this.writeReplicaSurveyPopupRepository.create(data);
        return await this.writeReplicaSurveyPopupRepository.save(savedResult);
    }
    async findOne(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyPopupRepository.createQueryBuilder('survey')
        .leftJoinAndMapOne(
            'survey.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = survey.org_id AND company.status = 1`,
          )
        .where(condition)
        .getOne();
    }
    async delete(condition: any) {
        await this.writeReplicaSurveyPopupRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSurveyPopupRepository.metadata);
        return await this.writeReplicaSurveyPopupRepository.createQueryBuilder('survey')
            .update(SurveyPopupEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyPopupRepository.createQueryBuilder('survey')
        .leftJoinAndMapOne(
            'survey.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = survey.org_id AND company.status = 1`,
          )
        .where(condition)
        .getMany();
    }
    async surveyPopupData(fields: any, condition: any,org_id:any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyPopupRepository.createQueryBuilder('Surveypopup')
        .leftJoinAndMapMany(
            'Surveypopup.Surveyquestions',
            tableConstant.SURVEY.TBL_C_SURVEY_QUESTIONS,
            'Surveyquestions',
            `Surveyquestions.org_id = ${org_id} AND Surveypopup.id = Surveyquestions.popup_id AND Surveyquestions.status = 1`,
          )
          .leftJoinAndMapMany(
            'Surveyquestions.SurveyAnswer',
            tableConstant.SURVEY.TBL_C_SURVEY_ANSWERS,
            'SurveyAnswer',
            `SurveyAnswer.q_id = Surveyquestions.id AND SurveyAnswer.status = 1`,
          )
        .where(condition)
        .select(fields)
        .getOne();
    }
    async surveyPopupStatus(fields: any, condition: any,org_id:any,user_id : any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyPopupRepository.createQueryBuilder('Surveypopup')
        .leftJoinAndMapMany(
            'Surveypopup.Surveyquestions',
            tableConstant.SURVEY.TBL_C_SURVEY_QUESTIONS,
            'Surveyquestions',
            `Surveyquestions.org_id = ${org_id} AND Surveypopup.id = Surveyquestions.popup_id AND Surveyquestions.status = 1`,
          )
          .leftJoinAndMapMany(
            'Surveyquestions.SurveyAnswers',
            tableConstant.SURVEY.TBL_C_SURVEY_ANSWERS,
            'SurveyAnswers',
            `SurveyAnswers.q_id = Surveyquestions.id AND SurveyAnswers.status = 1`,
          )
        .leftJoinAndMapMany(
            'Surveypopup.Surveyanswer',
            tableConstant.SURVEY.TBL_C_SURVEY_USER_ANSWERS,
            'Surveyanswer',
            `Surveyanswer.org_id =${org_id} AND Surveyanswer.user_id=${user_id}  AND Surveyanswer.status = 1`,
        )
        .where(condition)
        .select(fields)
        .orderBy('Surveyanswer.id','DESC')
        .getOne();
    }
}
