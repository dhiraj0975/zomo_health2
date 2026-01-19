import { appConstant, CommonArrayService, CommonFileService, SquaresEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class SquaresService {
    constructor(
        @InjectRepository(SquaresEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSquaresRepository: Repository<SquaresEntity>,
        @InjectRepository(SquaresEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSquaresRepository: Repository<SquaresEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithChallengeInput) {
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
                : 'square.created_date';
        const queryResult = await this.readReplicaSquaresRepository.createQueryBuilder('square')
        .leftJoinAndMapOne(
            'square.card',
            tableConstant.CHALLENGE.TBL_CH_CARDS,
            'card',
            `card.id = square.card_id`,
          )
          .leftJoinAndMapOne(
            'square.internal_link',
            tableConstant.COMPANIES.TBL_COMPANY_INTERLINKS,
            'internal_link',
            `internal_link.id = square.link_id`,
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
        const savedResult = this.writeReplicaSquaresRepository.create(data);
        return await this.writeReplicaSquaresRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaSquaresRepository.metadata);
        return await this.writeReplicaSquaresRepository.createQueryBuilder('square')
            .update(SquaresEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaSquaresRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSquaresRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSquaresRepository.find({
            where: condition,
            order: orderBy,
        });
    }
}
