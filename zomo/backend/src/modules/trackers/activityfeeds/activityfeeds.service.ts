import { ActivityFeedsEntity, appConstant, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithFoodInput } from '../input';
@Injectable()
export class ActivityFeedService {
    constructor(
        @InjectRepository(ActivityFeedsEntity, appConstant.READ_REPLICA.toLowerCase())
            private readonly readReplicaActivityFeedsRepository: Repository<ActivityFeedsEntity>,
        @InjectRepository(ActivityFeedsEntity, appConstant.MAIN.toLowerCase())
            private readonly writeReplicaActivityFeedsRepository: Repository<ActivityFeedsEntity>,
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
        const queryResult = await this.readReplicaActivityFeedsRepository.createQueryBuilder('food')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaActivityFeedsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['food'], groupBy: any = null) {
        if (!orderBy) {
            orderBy = { 'food.acId': 'DESC' };
        }
        let query = await this.readReplicaActivityFeedsRepository.createQueryBuilder('food')
        .where(condition)
        .select(fields); 
        if(groupBy){
            groupBy = groupBy == true ? 'food.collectionDate, food.activityName' : groupBy;
            query = query
            .groupBy(groupBy)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            if(groupBy == 'food.collectionDate, food.activityName'){
                query =  query.take(10);
            }
            return await query.getRawMany();
        }
        const regex = /SUM/;
        const hasSumKey = fields.some(item => regex.test(item));
        if(hasSumKey){
            return await query
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
        }
        return await this.readReplicaActivityFeedsRepository.createQueryBuilder('food')
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaActivityFeedsRepository.create(data);
        return await this.writeReplicaActivityFeedsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaActivityFeedsRepository.metadata);
        return await this.writeReplicaActivityFeedsRepository.createQueryBuilder('food')
            .update(ActivityFeedsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaActivityFeedsRepository.delete(condition);
    }
    async getUserActivityData(condition: any, fields: any, groupBy: any = null, orderBy: any = null) {
        let query =  await this.readReplicaActivityFeedsRepository.createQueryBuilder('food')
        .where(condition)
        .select(fields)
        .groupBy(groupBy);
        if (orderBy) {
            query = query.orderBy(`${orderBy}`, 'ASC');
        }
        return await query.getRawMany();
    }
    async findAllSteps(condition: any) {
        const result = await this.readReplicaActivityFeedsRepository
            .createQueryBuilder('activityFeed')
            .select('SUM(activityFeed.steps) AS steps')
            .addSelect('activityFeed.user_id')
            .addSelect('activityFeed.collectionDate')
            .where(condition)
            .groupBy('activityFeed.user_id')
            .addGroupBy('activityFeed.collectionDate')
            .orderBy('activityFeed.collectionDate')
            .getRawMany();
        return result;
    }
    async findStepsReport(condition: any) {
        const result = await this.readReplicaActivityFeedsRepository
            .createQueryBuilder('activityFeed')
            .select('SUM(activityFeed.steps) AS total_steps')
            .addSelect('activityFeed.user_id AS user_id')
            .addSelect('activityFeed.collectionDate AS collectionDate')
            .addSelect('activityFeed.logType AS logType')
            .addSelect('count(activityFeed.acId) as total')
            .where(condition)
            .groupBy('activityFeed.collectionDate')
            .addGroupBy('activityFeed.logType')
            .addGroupBy('activityFeed.user_id')
            .orderBy('activityFeed.collectionDate')
            .addOrderBy('activityFeed.user_id')
            .addOrderBy('activityFeed.logType')
            .getRawMany();
        return result;
    }
}