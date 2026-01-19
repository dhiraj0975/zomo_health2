import { appConstant, CommonArrayService, CommonFileService, QuizWebinarEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithCompanyInput } from 'src/input';
import { DeepPartial, FindOptionsOrder, FindOptionsWhere, Repository, UpdateResult } from 'typeorm';
@Injectable()
export class QuizWebinarService {
    constructor(
        @InjectRepository(QuizWebinarEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizWebinarRepository: Repository<QuizWebinarEntity>,
        @InjectRepository(QuizWebinarEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuizWebinarRepository: Repository<QuizWebinarEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) { }
    async paginateList(fields: string[] = [], condition: string, paginationParam: PaginateWithCompanyInput) {
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
                : 'qw.id';
        const queryResult = await this.readReplicaQuizWebinarRepository.createQueryBuilder('qw')
            .where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async userSideWebinarPaginate(fields: string[] = [], condition: string, paginationParam: PaginateWithCompanyInput, orderBy: string = 'qw.id', order: string = 'DESC') {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        order = order
            ? order
            : 'DESC';
        orderBy = orderBy
            ? orderBy
            : 'qw.id';
        const queryResult = await this.readReplicaQuizWebinarRepository.createQueryBuilder('qw')
            .innerJoinAndMapOne(
                'qw.aqo',
                tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG,
                'aqo',
                `aqo.webinar_id = qw.id AND aqo.status = 1`,
            )
            .where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: DeepPartial<QuizWebinarEntity>): Promise<QuizWebinarEntity> {
        const savedResult = this.writeReplicaQuizWebinarRepository.create(data);
        return await this.writeReplicaQuizWebinarRepository.save(savedResult);
    }
    async update(condition: FindOptionsWhere<QuizWebinarEntity>, data: DeepPartial<QuizWebinarEntity>): Promise<UpdateResult> {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuizWebinarRepository.metadata);
        return await this.writeReplicaQuizWebinarRepository.createQueryBuilder('qw')
            .update(QuizWebinarEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: FindOptionsWhere<QuizWebinarEntity>) {
        await this.writeReplicaQuizWebinarRepository.delete(condition);
    }
    async findOne(condition: FindOptionsWhere<QuizWebinarEntity>, orderBy: FindOptionsOrder<QuizWebinarEntity> = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = await this.readReplicaQuizWebinarRepository.createQueryBuilder('qw')
        queryResult = await queryResult.where(condition)
            .orderBy(`qw.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
        return queryResult;
    }
    async listRecord(fields: string[], condition: FindOptionsWhere<QuizWebinarEntity> | string, orderBy: FindOptionsOrder<QuizWebinarEntity> = null, tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaQuizWebinarRepository.createQueryBuilder('qw')
        if (tableData.includes(tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG)) {
            queryResult = queryResult.innerJoinAndMapOne(
                'qw.aqo',
                tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG,
                'aqo',
                `aqo.webinar_id = qw.id AND aqo.status = 1`,
            )
        }
        queryResult = await queryResult.select(fields).where(condition)
            .orderBy(`qw.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return queryResult;
    }
}
