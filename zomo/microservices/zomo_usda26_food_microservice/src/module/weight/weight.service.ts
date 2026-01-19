import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { appConstant } from 'src/constant';
import { WeightEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class WeightService {
    constructor(
        @InjectRepository(WeightEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaWeightRepository: Repository<WeightEntity>,
        @InjectRepository(WeightEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaWeightRepository: Repository<WeightEntity>,
    ) {}
    async createWeight(data: any) {
        const savedResult = this.writeReplicaWeightRepository.create(data);
        return await this.writeReplicaWeightRepository.insert(savedResult);
    }
    async updateWeight(condition: any, data: any) {
        return await this.writeReplicaWeightRepository.createQueryBuilder('food')
            .update(WeightEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async deleteWeight(condition: any) {
        return await this.writeReplicaWeightRepository.delete(condition);
    }
    async listWeight(condition: any) {
        return await this.readReplicaWeightRepository.createQueryBuilder('food')
            .where(condition)
            .getMany();
    }
    async getOneWeight(condition: any) {
        return await this.readReplicaWeightRepository.createQueryBuilder('food')
            .where(condition)
            .getOne();
    }
    async paginateWeight(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaWeightRepository.createQueryBuilder(
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
