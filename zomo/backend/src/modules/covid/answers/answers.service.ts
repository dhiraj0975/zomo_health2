import { appConstant, CommonArrayService, CommonFileService, CovidAnswerEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateCovidInput } from "../../../input";
@Injectable()
export class AnswersService {
    constructor(
        @InjectRepository(CovidAnswerEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaanswersRepository: Repository<CovidAnswerEntity>,
        @InjectRepository(CovidAnswerEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaanswersRepository: Repository<CovidAnswerEntity>,
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
                : 'answers.id';
        const queryResult = await this.readReplicaanswersRepository.createQueryBuilder('answers')
            .leftJoinAndMapOne(
                'answers.question',
                tableConstant.COVID.COVID_QUESTIONS,
                'question',
                `question.id = answers.q_id AND question.status != 2`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaanswersRepository.createQueryBuilder('answers')
            .leftJoinAndMapOne(
                'answers.question',
                tableConstant.COVID.COVID_QUESTIONS,
                'question',
                `question.id = answers.q_id AND question.status != 2`,
            )
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaanswersRepository.createQueryBuilder('answers')
            .leftJoinAndMapOne(
                'answers.question',
                tableConstant.COVID.COVID_QUESTIONS,
                'question',
                `question.id = answers.q_id AND question.status != 2`,
            )
            .where(condition)            
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaanswersRepository.create(data);
        return await this.writeReplicaanswersRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaanswersRepository.metadata);
        return await this.writeReplicaanswersRepository.createQueryBuilder('answers')
            .update(CovidAnswerEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaanswersRepository.delete(condition);
    }
}