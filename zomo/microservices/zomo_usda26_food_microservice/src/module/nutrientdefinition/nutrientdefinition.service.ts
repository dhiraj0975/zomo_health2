import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { appConstant } from 'src/constant';
import { NutritionDefEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class NutrientDefinitionService {
    constructor(
        @InjectRepository(NutritionDefEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaNutritionDefRepository: Repository<NutritionDefEntity>,
        @InjectRepository(NutritionDefEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaNutritionDefRepository: Repository<NutritionDefEntity>,
    ) {}
    async createNutritionDef(data: any) {
        const savedResult = this.writeReplicaNutritionDefRepository.create(data);
        return await this.writeReplicaNutritionDefRepository.insert(savedResult);
    }
    async updateNutritionDef(condition: any, data: any) {
        return await this.writeReplicaNutritionDefRepository.createQueryBuilder('food')
            .update(NutritionDefEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async deleteNutritionDef(condition: any) {
        return await this.writeReplicaNutritionDefRepository.delete(condition);
    }
    async listNutritionDef(condition: any) {
        return await this.readReplicaNutritionDefRepository.createQueryBuilder('food')
            .where(condition)
            .getMany();
    }
    async getOneNutritionDef(condition: any) {
        return await this.readReplicaNutritionDefRepository.createQueryBuilder('food')
            .where(condition)
            .getOne();
    }
    async paginateNutritionDef(
        condition: any,
        order: any,
        orderBy: any,
        paginateObj: any,
    ) {
        const queryResult =
            await this.readReplicaNutritionDefRepository.createQueryBuilder('food')
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
