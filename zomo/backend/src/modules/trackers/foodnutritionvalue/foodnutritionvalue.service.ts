import { appConstant, CommonArrayService, CommonFileService, FoodNutritionValueEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithFoodInput } from '../input';
@Injectable()
export class FoodNutritionValuesService {
    constructor(
        @InjectRepository(FoodNutritionValueEntity, appConstant.READ_REPLICA.toLowerCase())
            private readonly readReplicaFoodNutritionValuesRepository: Repository<FoodNutritionValueEntity>,
        @InjectRepository(FoodNutritionValueEntity, appConstant.MAIN.toLowerCase())
            private readonly writeReplicaFoodNutritionValuesRepository: Repository<FoodNutritionValueEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithFoodInput) {
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
                : 'food.collectionDate';
        const queryResult = await this.readReplicaFoodNutritionValuesRepository.createQueryBuilder('food')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFoodNutritionValuesRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaFoodNutritionValuesRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFoodNutritionValuesRepository.create(data);
        return await this.writeReplicaFoodNutritionValuesRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFoodNutritionValuesRepository.metadata);
        return await this.writeReplicaFoodNutritionValuesRepository.createQueryBuilder('food')
            .update(FoodNutritionValueEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFoodNutritionValuesRepository.delete(condition);
    }
}