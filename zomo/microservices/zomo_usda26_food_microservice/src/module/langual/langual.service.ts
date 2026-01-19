import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { appConstant } from 'src/constant';
import { LangualEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class LangualService {
    constructor(
        @InjectRepository(LangualEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaLangualRepository: Repository<LangualEntity>,
        @InjectRepository(LangualEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLangualRepository: Repository<LangualEntity>,
    ) {}
    async createLangual(data: any) {
        const savedResult = this.writeReplicaLangualRepository.create(data);
        return await this.writeReplicaLangualRepository.insert(savedResult);
    }
    async updateLangual(condition: any, data: any) {
        return await this.writeReplicaLangualRepository.createQueryBuilder('food')
            .update(LangualEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async deleteLangual(condition: any) {
        return await this.writeReplicaLangualRepository.delete(condition);
    }
    async listLangual(condition: any) {
        return await this.readReplicaLangualRepository.createQueryBuilder('food')
            .where(condition)
            .getMany();
    }
    async getOneLangual(condition: any) {
        return await this.readReplicaLangualRepository.createQueryBuilder('food')
            .where(condition)
            .getOne();
    }
    async paginateLangual(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaLangualRepository.createQueryBuilder(
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
