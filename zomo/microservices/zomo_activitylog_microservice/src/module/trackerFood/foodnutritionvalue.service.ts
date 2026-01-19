import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FoodNutritionValueEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class FoodNutritionValueService {
    constructor(
        @InjectRepository(FoodNutritionValueEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFoodNutritionValueRepository: Repository<FoodNutritionValueEntity>,
        @InjectRepository(FoodNutritionValueEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFoodNutritionValueRepository: Repository<FoodNutritionValueEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaFoodNutritionValueRepository.create(data);
        return await this.writeReplicaFoodNutritionValueRepository.save(savedResult);
    }
}
