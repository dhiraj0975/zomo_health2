import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { appConstant } from 'src/constant';
import { FoodGroupEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class FoodGroupService {
    constructor(
        @InjectRepository(FoodGroupEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFoodGroupRepository: Repository<FoodGroupEntity>,
        @InjectRepository(FoodGroupEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFoodGroupRepository: Repository<FoodGroupEntity>,
    ) {}
    async createFoodGroup(data: any) {
        const savedResult = this.writeReplicaFoodGroupRepository.create(data);
        return await this.writeReplicaFoodGroupRepository.insert(savedResult);
    }
    async updateFoodGroup(condition: any, data: any) {
        return await this.writeReplicaFoodGroupRepository.createQueryBuilder('food')
            .update(FoodGroupEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async statusFoodGroup(condition: any, data: any) {
        return await this.writeReplicaFoodGroupRepository.createQueryBuilder('food')
            .update(FoodGroupEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listFoodGroup(condition: any) {
        return await this.readReplicaFoodGroupRepository.createQueryBuilder('food')
            .select(['food.id', 'food.email'])
            .where(condition)
            .getMany();
    }
    async getOneFoodGroup(condition: any) {
        return await this.readReplicaFoodGroupRepository.createQueryBuilder('food')
            .select([])
            .where(condition)
            .getOne();
    }
    async paginateFoodGroup(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaFoodGroupRepository.createQueryBuilder(
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
