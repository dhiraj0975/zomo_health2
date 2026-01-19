import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FoodDescEntity } from 'src/entity';
import { Repository } from 'typeorm';
import { appConstant, tableConstant } from '../../constant';
@Injectable()
export class FoodDescriptionService {
    constructor(
        @InjectRepository(FoodDescEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFoodDescRepository: Repository<FoodDescEntity>,
        @InjectRepository(FoodDescEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFoodDescRepository: Repository<FoodDescEntity>,
    ) {}
    async createFoodDesc(data: any) {
        const savedResult = this.writeReplicaFoodDescRepository.create(data);
        return await this.writeReplicaFoodDescRepository.insert(savedResult);
    }
    async updateFoodDesc(condition: any, data: any) {
        return await this.writeReplicaFoodDescRepository.createQueryBuilder('food')
            .update(FoodDescEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listFoodDesc(condition: any) {
        return await this.readReplicaFoodDescRepository.createQueryBuilder('food')
            .select(['food.NDB_No', 'food.Long_Desc'])
            .where(condition)
            .getMany();
    }
    async getOneFoodDesc(condition: any) {
        return await this.readReplicaFoodDescRepository.createQueryBuilder('food')
        .leftJoinAndMapMany(
            'food.nutrition',
            tableConstant.TBL_NUT_DATA,
            'nutrition',
            `nutrition.NDB_No = food.NDB_No`,
          )
        .leftJoinAndMapOne(
            'nutrition.nutrition_def',
            tableConstant.TBL_NUTR_DEF,
            'nutrition_def',
            `nutrition_def.Nutr_No = nutrition.Nutr_No`,
          )
            .where(condition)
            .getOne();
    }
    async paginateFoodDesc(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult = await this.readReplicaFoodDescRepository.createQueryBuilder(
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
