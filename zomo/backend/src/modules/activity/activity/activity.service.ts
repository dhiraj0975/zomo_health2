import { ActivityEntity, appConstant, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationActivityInput } from "../../../input";
@Injectable()
export class ActivityService {
    constructor(
        @InjectRepository(ActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaActivityRepository: Repository<ActivityEntity>,
        @InjectRepository(ActivityEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaActivityRepository: Repository<ActivityEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(fields: any[] = [],condition: any, paginationParam: PaginationActivityInput,tableData: any[] = [],) {
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
                ? `activity.${paginationParam.order_by}`
                : 'activity.added_date';
        let queryResult: any = this.readReplicaActivityRepository.createQueryBuilder('activity')
            .leftJoinAndMapOne(
                'activity.category',
                tableConstant.ACTIVITIES.TBL_CATEGORIES,
                'category',
                `category.id = activity.category_id`
            )
            .leftJoinAndMapOne(
                'activity.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = activity.accebility AND company.status != 2`
                // `company.id = activity.accebility AND company.status = 1` changed fornot showing in superadmin
            )
        if (tableData.includes(tableConstant.COACH.TBL_CO_COACHES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'activity.coach',
                tableConstant.COACH.TBL_CO_COACHES,
                'coach',
                `activity.accebility = coach.org_id OR activity.accebility = '0'`,
            )
        }
        queryResult = await queryResult.select(fields).where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaActivityRepository.create(data);
        return await this.writeReplicaActivityRepository.save(savedResult);
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
            // `company.id = activity.accebility AND company.status = 1` changed fornot showing in superadmin
          );
        if (fields) {
            query = query.select(fields);
        }
        return await query.where(condition).getOne();
    }
    async delete(condition: any) {
        await this.writeReplicaActivityRepository.delete(condition);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaActivityRepository.metadata);
        return await this.writeReplicaActivityRepository.createQueryBuilder('activity')
            .update(ActivityEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['activity'],tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaActivityRepository.createQueryBuilder('activity')
        if (tableData.includes(tableConstant.COACH.TBL_CO_COACHES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'activity.coach',
                tableConstant.COACH.TBL_CO_COACHES,
                'coach',
                `activity.accebility = coach.org_id OR activity.accebility = '0' AND coach.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.ACTIVITIES.TBL_CATEGORIES)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'activity.category',
                tableConstant.ACTIVITIES.TBL_CATEGORIES,
                'category',
                `category.id = activity.category_id AND category.status != '2'`,
            )
        }
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'activity.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = activity.accebility AND company.status = 1`,
            )
        }
        queryResult = queryResult.where(condition)
        .select(fields)
        if (tableData.includes(tableConstant.ACTIVITIES.TBL_CATEGORIES)) {
            queryResult = queryResult.addOrderBy('category.category_name', 'ASC');
        } else {
            queryResult = queryResult.orderBy(`activity.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        }
        queryResult = await queryResult.getMany();
        return queryResult;
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
