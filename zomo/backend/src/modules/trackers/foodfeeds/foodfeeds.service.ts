import { appConstant, CommonArrayService, CommonFileService, FoodFeedsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithFoodInput } from '../input';
@Injectable()
export class FoodFeedService {
    constructor(
        @InjectRepository(FoodFeedsEntity, appConstant.READ_REPLICA.toLowerCase())
            private readonly readReplicaFoodFeedsRepository: Repository<FoodFeedsEntity>,
        @InjectRepository(FoodFeedsEntity, appConstant.MAIN.toLowerCase())
            private readonly writeReplicaFoodFeedsRepository: Repository<FoodFeedsEntity>,
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
        const queryResult = await this.readReplicaFoodFeedsRepository.createQueryBuilder('food')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaFoodFeedsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, field: any[] = ["food"], challenge: boolean = false, groupBy: any = null , addOrderBy: any = null) {
        if (!orderBy) {
            orderBy = { 'food.id': 'DESC' };
        }
        let query= this.readReplicaFoodFeedsRepository.createQueryBuilder('food')
        .where(condition)
        .select(field);
        if(groupBy){
            groupBy = groupBy == true ? 'food.collectionDate' : groupBy;
            query = query
            .groupBy(groupBy);
        }
        if(addOrderBy){
            addOrderBy = addOrderBy == true ? 'food.amount' : addOrderBy;
            query = query
            .addOrderBy(addOrderBy);
        }
        query = query.orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        return challenge ?  await query.getRawMany() : await query.getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFoodFeedsRepository.create(data);
        return await this.writeReplicaFoodFeedsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaFoodFeedsRepository.metadata);
        return await this.writeReplicaFoodFeedsRepository.createQueryBuilder('food')
            .update(FoodFeedsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaFoodFeedsRepository.delete(condition);
    }
    async totalWater(condition: any, orderBy: any = null, fields: any = ['food'], groupBy: any = null) {
        if (!orderBy) {
            orderBy = { water: 'DESC' };
        }
        return await this.readReplicaFoodFeedsRepository.createQueryBuilder('food')
        .where(condition)
        .select(fields)
        .groupBy(groupBy)
        .orderBy(`food.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getRawMany();
    }
    async findfoodReport(condition: any) {
        const result = await this.readReplicaFoodFeedsRepository
            .createQueryBuilder('food')
            .select('food.user_id AS user_id')
            .addSelect('food.collectionDate AS collectionDate')
            .addSelect('count(food.id) as total')
            .where(condition)
            .groupBy('food.collectionDate')
            .addGroupBy('food.user_id')
            .orderBy('food.collectionDate')
            .addOrderBy('food.user_id')
            .getRawMany();
        return result;
    }
}