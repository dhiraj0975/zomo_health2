import { appConstant, CardsEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class CardsService {
    constructor(
        @InjectRepository(CardsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCardsRepository: Repository<CardsEntity>,
        @InjectRepository(CardsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCardsRepository: Repository<CardsEntity>,
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
                : 'card.created_date';
        let queryResult = await this.readReplicaCardsRepository.createQueryBuilder('card')
        .leftJoinAndMapMany(
            'card.square',
            tableConstant.CHALLENGE.TBL_CH_SQUARES,
            'square',
            `square.card_id = card.id AND square.status = 1`,
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
        const savedResult = this.writeReplicaCardsRepository.create(data);
        return await this.writeReplicaCardsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCardsRepository.metadata);
        return await this.writeReplicaCardsRepository.createQueryBuilder('c')
            .update(CardsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaCardsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCardsRepository.createQueryBuilder('card')
        .leftJoinAndMapMany(
            'card.square',
            tableConstant.CHALLENGE.TBL_CH_SQUARES,
            'square',
            `square.card_id = card.id AND square.status = 1`,
          )
            .where(condition)
            .orderBy(`card.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCardsRepository.createQueryBuilder('card')
        .leftJoinAndMapMany(
            'card.square',
            tableConstant.CHALLENGE.TBL_CH_SQUARES,
            'square',
            `square.card_id = card.id AND square.status = 1`,
          )
            .where(condition)
            .orderBy(`card.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
}
