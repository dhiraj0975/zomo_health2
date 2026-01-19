import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { appConstant } from 'src/constant';
import { LangDescEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class LangDescriptionService {
    constructor(
        @InjectRepository(LangDescEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaLangDescRepository: Repository<LangDescEntity>,
        @InjectRepository(LangDescEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLangDescRepository: Repository<LangDescEntity>,
    ) {}
    async createLangDesc(data: any) {
        const savedResult = this.writeReplicaLangDescRepository.create(data);
        return await this.writeReplicaLangDescRepository.insert(savedResult);
    }
    async updateLangDesc(condition: any, data: any) {
        return await this.writeReplicaLangDescRepository.createQueryBuilder('food')
            .update(LangDescEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async deleteLangDesc(condition: any) {
        return await this.writeReplicaLangDescRepository.delete(condition);
    }
    async listLangDesc(condition: any) {
        return await this.readReplicaLangDescRepository.createQueryBuilder('food')
            .where(condition)
            .getMany();
    }
    async getOneLangDesc(condition: any) {
        return await this.readReplicaLangDescRepository.createQueryBuilder('food')
            .where(condition)
            .getOne();
    }
    async paginateLangDesc(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaLangDescRepository.createQueryBuilder(
            'food',
        )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return {
            list: result,
            total: total,
            pages: Math.ceil(total / paginateObj.take),
            limit: paginateObj.take,
            page: paginateObj.page,
        };
    }
}
