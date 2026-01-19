import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    EventUserBookingListsEntity,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class EventUserBookingListsService  extends BaseService<EventUserBookingListsEntity> {
    constructor(
        @InjectRepository(EventUserBookingListsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventUserBookingListsRepository: Repository<EventUserBookingListsEntity>,
        @InjectRepository(EventUserBookingListsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventUserBookingListsRepository: Repository<EventUserBookingListsEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaEventUserBookingListsRepository,writeReplicaEventUserBookingListsRepository,'userBookingLists',commonArrayService);
    }
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
                : 'eubl.created';
        var queryResult = await this.readReplicaEventUserBookingListsRepository.createQueryBuilder('eubl')
            .leftJoinAndMapOne(
                'eubl.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = eubl.ev_user_id`,
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
        const savedResult = this.writeReplicaEventUserBookingListsRepository.create(data);
        return await this.writeReplicaEventUserBookingListsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventUserBookingListsRepository.metadata);
        return await this.writeReplicaEventUserBookingListsRepository.createQueryBuilder('eubl')
            .update(EventUserBookingListsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaEventUserBookingListsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaEventUserBookingListsRepository.createQueryBuilder('eubl')
        .leftJoinAndMapOne(
            'eubl.event',
            tableConstant.EVENTS.TBL_EV_EVENTS,
            'event',
            `event.id = eubl.ev_events_id AND event.status = 1`,
        )
        .leftJoinAndMapOne(
            'eubl.slot',
            tableConstant.EVENTS.TBL_EV_SLOTS,
            'slot',
            `slot.id = eubl.ev_slots_id AND slot.status = 1`,
        )
        .leftJoinAndMapOne(
            'eubl.slotTiming',
            tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS,
            'slotTiming',
            `slotTiming.id = eubl.slot_selected AND slotTiming.status = 1`,
        )
        .where(condition)
        .orderBy(`eubl.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['eubl.*'], joinCondition: any = null, groupBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query =  this.readReplicaEventUserBookingListsRepository.createQueryBuilder('eubl')
        .leftJoinAndMapOne(
            'eubl.user',
            tableConstant.TBL_USERS,
            'user',
            joinCondition ? joinCondition : `user.id = eubl.ev_user_id`,
        )
        .leftJoinAndMapOne(
            'eubl.slotTiming',
            tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS,
            'slotTiming',
            `slotTiming.id = eubl.slot_selected AND slotTiming.status = 1`,
          )
        .where(condition)
        .select(fields)
        .orderBy(`eubl.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        if(groupBy){
            return await query
              .groupBy(groupBy)
              .getRawMany();
          }
          else{
            return await query
            .getMany();
          }
    }
    async userBookingListRecord(condition: any, orderBy: any = null, fields: any = []) {
        if (!orderBy) {
            orderBy = { 'eubl.id': 'DESC' };
        }
        return await this.readReplicaEventUserBookingListsRepository.createQueryBuilder('eubl')
            .leftJoinAndMapOne(
                'eubl.slotTiming',
                tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS,
                'slotTiming',
                `slotTiming.id = eubl.slot_selected AND slotTiming.status = 1`,
            )
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
    }
    async eventData(condition: any, orderBy: any = null, fields: any = ['userBookingList.*']) {
        if (!orderBy) {
            orderBy = { 'userBookingList.id': 'DESC' };
        }
        return await this.readReplicaEventUserBookingListsRepository.createQueryBuilder('userBookingList')
        .leftJoinAndMapOne(
            'userBookingList.ev_event',
            tableConstant.EVENTS.TBL_EV_EVENTS,
            'ev_event',
            `ev_event.id = userBookingList.ev_events_id `,
          )
          .leftJoinAndMapOne(
            'userBookingList.ev_slotstimings',
            tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS,
            'ev_slotstimings',
            `ev_slotstimings.id = userBookingList.slot_selected AND CONCAT(DATE_FORMAT(ev_slotstimings.slotdate, '%Y-%m-%d '), DATE_FORMAT(ev_slotstimings.slotstarttime, '%H:%i:%s')) >= NOW()`,
          )
        .where(condition)
        .select(fields)
        .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async unregisterList(condition: any, paginationParam: PaginateWithCompanyInput, joinCondition: string) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        let userCondition = `user.id = eubl.ev_user_id`;
        if(joinCondition && joinCondition != '') {
            userCondition += ` AND ${userCondition}`;
        }
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'eubl.created';
        var queryResult = await this.readReplicaEventUserBookingListsRepository.createQueryBuilder('eubl')
            .leftJoinAndMapOne(
                'eubl.user',
                tableConstant.TBL_USERS,
                'user',
                userCondition,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .getManyAndCount();
        const [result, total] = queryResult;        
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async userBookingListRecordGlobalCoach(condition: any, orderBy: any = null, fields: any = ['eubl']) {
        if (!orderBy) {
            orderBy = { 'eubl.id': 'DESC' };
        }
        return await this.readReplicaEventUserBookingListsRepository.createQueryBuilder('eubl')
            .innerJoinAndMapOne(
                'eubl.user',
                tableConstant.TBL_USERS,
                'user','user.id = eubl.ev_user_id AND user.status != 2'
            )   
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
}
