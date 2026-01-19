import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    FoodFeedsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FoodFeedService extends BaseService<FoodFeedsEntity> {
    constructor(
        @InjectRepository(
            FoodFeedsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaFoodFeedsRepository: Repository<FoodFeedsEntity>,
        @InjectRepository(FoodFeedsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFoodFeedsRepository: Repository<FoodFeedsEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
    ) {
        super(
            readReplicaFoodFeedsRepository,
            writeReplicaFoodFeedsRepository,
            'foodFeeds',
            commonArrayService,
        );
    }
    async findOne(condition: any) {
        return await this.readReplicaFoodFeedsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(
        condition: any,
        orderBy: any = null,
        field: any[] = ['food'],
        challenge: boolean = false,
        groupBy: any = null,
        addOrderBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { 'food.id': 'DESC' };
        }
        let query = this.readReplicaFoodFeedsRepository
            .createQueryBuilder('food')
            .where(condition)
            .select(field);
        if (groupBy) {
            groupBy = groupBy == true ? 'food.collectionDate' : groupBy;
            query = query.groupBy(groupBy);
        }
        if (addOrderBy) {
            addOrderBy = addOrderBy == true ? 'food.amount' : addOrderBy;
            query = query.addOrderBy(addOrderBy);
        }
        query = query.orderBy(
            `${Object.keys(orderBy)[0]}`,
            orderBy[Object.keys(orderBy)[0]],
        );
        return challenge ? await query.getRawMany() : await query.getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaFoodFeedsRepository.create(data);
        return await this.writeReplicaFoodFeedsRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaFoodFeedsRepository.delete(condition);
    }
    async totalWater(
        condition: any,
        orderBy: any = null,
        fields: any = ['food'],
        groupBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { water: 'DESC' };
        }
        return await this.readReplicaFoodFeedsRepository
            .createQueryBuilder('food')
            .where(condition)
            .select(fields)
            .groupBy(groupBy)
            .orderBy(
                `food.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getRawMany();
    }
    async findfoodReportStream(condition: any) {
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
            .stream();
        return result;
    }
}
