import { appConstant, CommonArrayService, CommonFileService, EventCategoryEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class EventCategoryService {
    constructor(
        @InjectRepository(EventCategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventCategoryRepository: Repository<EventCategoryEntity>,
        @InjectRepository(EventCategoryEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventCategoryRepository: Repository<EventCategoryEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly activityLogService: ActivityLogService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
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
                : 'e_category.created';
        const queryResult = await this.readReplicaEventCategoryRepository.createQueryBuilder('e_category')
        .leftJoinAndMapOne(
            'e_category.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = e_category.c_companies_id AND company.status = 1`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaEventCategoryRepository.create(data);
        return await this.writeReplicaEventCategoryRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventCategoryRepository.metadata);
        return await this.writeReplicaEventCategoryRepository.createQueryBuilder('e_category')
            .update(EventCategoryEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaEventCategoryRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null,fields: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaEventCategoryRepository.createQueryBuilder('e_category')
        .leftJoinAndMapOne(
            'e_category.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = e_category.c_companies_id AND company.status = 1`,
          )
            .where(condition)
            .getOne();
    }
    async listRecord(fields: any, condition: any, orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let queryResult: any = this.readReplicaEventCategoryRepository.createQueryBuilder('e_category')
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'e_category.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = e_category.c_companies_id AND company.status = 1`,
            )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EVENTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'e_category.events',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'events',
                `events.category_id = e_category.id AND events.status = 1`,
            )
        }
        queryResult = await queryResult.where(condition).select(fields)
            .orderBy(`e_category.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return queryResult;
    }
    async updateOrder(data: any, req:any =null) {
        let i = 0;
        for(let id of data.order) {
            await this.writeReplicaEventCategoryRepository.createQueryBuilder('disease')
                .update(EventCategoryEntity)
                .set({order_no: ++i})
                .where({id})
                .execute();
                this.activityLogService.create({id:id, order_no: 0}, {order_no: i}, tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY, req.tokenUser?.id);
        }
    }
}
