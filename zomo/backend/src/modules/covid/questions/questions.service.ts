import { appConstant, CommonArrayService, CommonFileService, CovidQuestionsEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateCovidInput } from "../../../input";
@Injectable()
export class QuestionsService {
    constructor(
        @InjectRepository(CovidQuestionsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaquestionsRepository: Repository<CovidQuestionsEntity>,
        @InjectRepository(CovidQuestionsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaquestionsRepository: Repository<CovidQuestionsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateCovidInput) {
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
                : 'questions.id';
        const queryResult = await this.readReplicaquestionsRepository.createQueryBuilder('questions')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaquestionsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaquestionsRepository.find({
            where: condition,
            select: ['id','org_id','title','status'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaquestionsRepository.create(data);
        return await this.writeReplicaquestionsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaquestionsRepository.metadata);
        return await this.writeReplicaquestionsRepository.createQueryBuilder('questions')
            .update(CovidQuestionsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaquestionsRepository.delete(condition);
    }
    async questionData(condition,feild =[]){
        return await this.readReplicaquestionsRepository.createQueryBuilder('questions')
        .leftJoinAndMapMany(
            'questions.CovidAnswer',
            tableConstant.COVID.COVID_ANSWERS,
            'CovidAnswer',
            `CovidAnswer.q_id = questions.id AND CovidAnswer.status = 1`,
          )
          .where(condition)
          .select(feild)
          .orderBy('questions.id', 'ASC')
          .getMany();
    }
}