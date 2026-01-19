import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonHealthService, CommonService, SurveyUserAnswersEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationSurveyInput } from "../../../input";
@Injectable()
export class SurveyUserAnswersService {
    constructor(
        @InjectRepository(SurveyUserAnswersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSurveyUserAnswersRepository: Repository<SurveyUserAnswersEntity>,
        @InjectRepository(SurveyUserAnswersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSurveyUserAnswersRepository: Repository<SurveyUserAnswersEntity>,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
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
        const queryResult = await this.readReplicaSurveyUserAnswersRepository.createQueryBuilder('survey')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaSurveyUserAnswersRepository.create(data);
        return await this.writeReplicaSurveyUserAnswersRepository.save(savedResult);
    }
    async findOne(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyUserAnswersRepository.createQueryBuilder('survey')
        .where(condition)
        .getOne();
    }
    async delete(condition: any) {
        await this.writeReplicaSurveyUserAnswersRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSurveyUserAnswersRepository.metadata);
        return await this.writeReplicaSurveyUserAnswersRepository.createQueryBuilder('survey')
            .update(SurveyUserAnswersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyUserAnswersRepository.createQueryBuilder('survey')
        .where(condition)
        .getMany();
    }
}
