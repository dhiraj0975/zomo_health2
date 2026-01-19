import { EventReportInput } from '@/modules/report/input/eventreport.input';
import { appConstant, CommonArrayService, CommonFileService, EventExternalLinkEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class EventExternalLinkService {
    constructor(
        @InjectRepository(EventExternalLinkEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventExternalLinkRepository: Repository<EventExternalLinkEntity>,
        @InjectRepository(EventExternalLinkEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventExternalLinkRepository: Repository<EventExternalLinkEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
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
                : 'elu.created';
        var queryResult = await this.readReplicaEventExternalLinkRepository.createQueryBuilder('elu')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaEventExternalLinkRepository.create(data);
        return await this.writeReplicaEventExternalLinkRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventExternalLinkRepository.metadata);
        return await this.writeReplicaEventExternalLinkRepository.createQueryBuilder('elu')
            .update(EventExternalLinkEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaEventExternalLinkRepository.delete(condition);
    }
    async findOne(condition: any) {
        return await this.readReplicaEventExternalLinkRepository.findOne({
            where: condition,
        });
    }

    async listRecords(fields: any, condition: any, paginationParam: EventReportInput, tableData: any[] = []) {
        try{
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'ASC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'externallink.created';
        let queryResult: any = this.readReplicaEventExternalLinkRepository.createQueryBuilder('externallink')
            .leftJoinAndMapOne(
                'externallink.event',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'event',
                `event.id = externallink.event_id AND event.status = 1`,
            )
            .leftJoinAndMapOne(
                'externallink.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = externallink.user_id AND user.status = 1`,
            );
            
        if (tableData.includes(tableConstant.TBL_USERS_SETTINGS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'user.usersetting',
                tableConstant.TBL_USERS_SETTINGS,
                'usersetting',
                `usersetting.user_id = user.id`,
            )
        }
        if (tableData.includes(tableConstant.COMPANIES.TBL_DEPARTMENT)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'user.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = user.department_id AND department.status = 1 AND department.deleted = 0`,
            )
        }
        if (tableData.includes(tableConstant.COMPANIES.TBL_LOCATION)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'user.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.id = user.location AND Location.status = 1 AND Location.deleted = 0`,
            )
        }
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'externallink.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = event.organization_id AND company.status = 1`,
            )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_LOCATIONS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'event.ev_location',
                tableConstant.EVENTS.TBL_EV_LOCATIONS,
                'ev_location',
                `ev_location.ev_events_id = event.id`,
            )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_DEPARTMENTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'event.ev_department',
                tableConstant.EVENTS.TBL_EV_DEPARTMENTS,
                'ev_department',
                `ev_department.ev_events_id = event.id`,
            )
        }
        queryResult = queryResult.select(fields)
            .where(condition)
            .orderBy(orderBy, <any>order);
        if(paginationParam.result_type == 1){
            queryResult = await queryResult
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
            const [result, total] = queryResult;
            return this.commonArrayService.paginationResponse(result, total, paginateObj)
        }
        else{
            queryResult = await queryResult.getMany(); 
            return queryResult;
        }
    }catch(err){
        console.log("err",err)
    }
    }
}
