import {
    ActivityEntity,
    appConstant,
    BaseService,
    CommonArrayService,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ActivityService extends BaseService<ActivityEntity> {
    constructor(
        @InjectRepository(ActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaActivityRepository: Repository<ActivityEntity>,
        @InjectRepository(ActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaActivityRepository: Repository<ActivityEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaActivityRepository, writeReplicaActivityRepository,'inActivity',commonArrayService);
    }
    
    async findOne(condition: any, orderBy = null, fields: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaActivityRepository.createQueryBuilder('activity')
        .leftJoinAndMapOne(
            'activity.category',
            tableConstant.ACTIVITIES.TBL_CATEGORIES,
            'category',
            `category.id = activity.category_id`,
        )
        .leftJoinAndMapOne(
            'activity.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = activity.accebility AND company.status != 2`
          );
        if (fields) {
            query = query.select(fields);
        }
        return await query.where(condition).getOne();
    }

    async activityFindOne(condition: any, select: any[] = [],orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaActivityRepository.findOne({
            where: condition,
            select : select,
            order: orderBy,
        });
    }
    async activityListRecord(condition: any, fields: any, orderBy: any = null): Promise<ActivityEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaActivityRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async getActivityLinks(condition: any, orderBy: any = null, fields: any = ['activity']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaActivityRepository.createQueryBuilder('activity')
        .where(condition).select(fields)
        .orderBy(`activity.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        return await queryResult.getRawMany();
    }
    async campaignActivityRecord(condition: any, fields: any = ['activity'], orderBy:any = null, getType: any = 'details', type : any = 'activitys') {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaActivityRepository.createQueryBuilder('activity')
        .leftJoinAndMapOne(
            'activity.category',
            tableConstant.ACTIVITIES.TBL_CATEGORIES,
            'category',
            `category.id = activity.category_id`,
        )
        .where(condition)
        .select(fields);
        if(type == 'activitys' || type == 'altactivity') {
            queryResult = queryResult.orderBy(orderBy);
        }else{
            queryResult = queryResult.orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]).groupBy('category.id');
        }
        if(getType == 'details') {
            return await queryResult.getMany();
        }else{
            return await queryResult.getRawMany();
        }
    }
}
