import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { appConstant } from 'src/constant';
import { NutritionDataEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class NutrientDataService {
    constructor(
        @InjectRepository(NutritionDataEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaNutritionDataRepository: Repository<NutritionDataEntity>,
        @InjectRepository(NutritionDataEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaNutritionDataRepository: Repository<NutritionDataEntity>,
    ) {}
    async createNutritionData(data: any) {
        const savedResult = this.writeReplicaNutritionDataRepository.create(data);
        return await this.writeReplicaNutritionDataRepository.insert(savedResult);
    }
    async updateNutritionData(condition: any, data: any) {
        return await this.writeReplicaNutritionDataRepository.createQueryBuilder('food')
            .update(NutritionDataEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async deleteNutritionData(condition: any) {
        return await this.writeReplicaNutritionDataRepository.delete(condition);
    }
    async listNutritionData(condition: any) {
        return await this.readReplicaNutritionDataRepository.createQueryBuilder('food')
            .where(condition)
            .getMany();
    }
    async getOneNutritionData(condition: any) {
        return await this.readReplicaNutritionDataRepository.createQueryBuilder('food')
            .where(condition)
            .getOne();
    }
    async paginateNutritionData(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult =
            await this.readReplicaNutritionDataRepository.createQueryBuilder('food')
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
