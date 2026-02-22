import { PaginateWithCoachesInput } from '@/modules/coach/input';
import { ActivityLogService } from '@/modules/master/activitylog/activitylog.service';
import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { appConstant, CommonArrayService, CommonDateService, CommonFileService, EventEntity, EventSlotsTimingsEntity, EventUserBookingListsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { PaginateWithEventInput } from './input';
@Injectable()
export class EventService {
    constructor(
        @InjectRepository(EventEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventRepository: Repository<EventEntity>,
        @InjectRepository(EventEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventRepository: Repository<EventEntity>,
        @InjectRepository(EventUserBookingListsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserBookingRepository: Repository<EventUserBookingListsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        @InjectRepository(EventSlotsTimingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventSlotsTimingsRepository: Repository<EventSlotsTimingsEntity>,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationsController: NotificationsController,
        private readonly commonDateService: CommonDateService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithEventInput) {
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
                : 'event.created';
        let queryResult = await this.readReplicaEventRepository.createQueryBuilder('event')
        .leftJoinAndMapOne(
            'event.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = event.organization_id AND company.status = 1`,
          )
          .leftJoinAndMapMany(
            'event.companies',
            tableConstant.EVENTS.TBL_EV_GLOBAL_EVENTS,
            'global_events',
            `global_events.event_id = event.id AND event.organization_id = 0 AND global_events.status != 2`,
          )
          .leftJoinAndMapOne(
            'global_events.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'companie',
            `companie.id = global_events.organization_id AND companie.status = 1`,
          )
        .leftJoinAndMapMany(
            'event.slot',
            tableConstant.EVENTS.TBL_EV_SLOTS,
            'slot',
            `slot.ev_events_id = event.id AND slot.status = 1`,
          )
          .leftJoinAndMapOne(
            'event.category',
            tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
            'category',
            `category.id = event.category_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        await Promise.all(result.map(async (element) => {          
          element['booking_count'] = 0;     
          let userBooking = await this.readReplicaUserBookingRepository
          .createQueryBuilder('bookings') 
          .innerJoinAndMapOne('bookings.user',tableConstant.TBL_USERS,'user','user.id = bookings.ev_user_id AND user.status != 2')           
          .where(`bookings.ev_events_id = ${element.id} AND bookings.status = 1`)
          // added for to show single entry for user
          // .groupBy('bookings.ev_user_id')
          .getMany();  
          if(userBooking.length > 0){  
            await Promise.all(userBooking.map(async (ele) => {
              if(ele?.slot_selected !== '-1') {
                let slotData = await this.readReplicaEventSlotsTimingsRepository.findOne({where: { id: Number(ele.slot_selected), status: 1}});                                                     
                if(!slotData){
                  element['booking_count'] += 1;
                }
              }
            }));  
            userBooking = userBooking.filter(
            (item, index, self) =>
              index === self.findIndex(t => t.ev_user_id === item.ev_user_id)
            ); 
            element['user_count'] = userBooking.length
          }                           
        }));
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
      const savedResult = this.writeReplicaEventRepository.create(data);
      return await this.writeReplicaEventRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
      data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventRepository.metadata);
        return await this.writeReplicaEventRepository.createQueryBuilder('event')
            .update(EventEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaEventRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null, tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaEventRepository.createQueryBuilder('event')
        .leftJoinAndMapOne(
            'event.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = event.organization_id AND company.status = 1`,
          )
          .leftJoinAndMapOne(
            'event.category',
            tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
            'category',
            `category.id = event.category_id AND category.status = 1`,
          )
          .leftJoinAndMapMany(
            'event.companies',
            tableConstant.EVENTS.TBL_EV_GLOBAL_EVENTS,
            'global_events',
            `global_events.event_id = event.id AND event.organization_id = 0 AND global_events.status != 2`,
          )
          .leftJoinAndMapOne(
            'global_events.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'companie',
            `companie.id = global_events.organization_id AND companie.status = 1`,
          );
          if (tableData.includes(tableConstant.EVENTS.TBL_EV_SLOTS)) {
            query = query
            .leftJoinAndMapMany(
              'event.slot',
              tableConstant.EVENTS.TBL_EV_SLOTS,
              'slot',
              `slot.ev_events_id = event.id AND slot.status = 1`,
            )
            .leftJoinAndMapMany(
              'event.bookings',
              tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
              'bookings',
              `bookings.ev_events_id = event.id AND (slot.id = bookings.ev_slots_id OR bookings.ev_slots_id = -1) AND bookings.status != 2`,
            )
            .leftJoinAndMapOne(
              'bookings.slotTiming',
              tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS,
              'slotTiming',
              `slotTiming.id = bookings.slot_selected`,
            )
            .leftJoinAndMapOne(
              'bookings.user',
              tableConstant.TBL_USERS,
              'user',
              `user.id = bookings.ev_user_id`,
            );
          }
          let resultData = await query.where(condition).getOne();
          if(resultData){
            let userBooking = await this.readReplicaUserBookingRepository
            .createQueryBuilder('bookings') 
            .innerJoinAndMapOne('bookings.user',tableConstant.TBL_USERS,'user','user.id = bookings.ev_user_id AND user.status != 2')           
            .where(`bookings.ev_events_id = ${resultData.id} AND bookings.status = 1`)
            .getMany();          
            if(userBooking.length > 0){  
              await Promise.all(userBooking.map(async (ele) => {  
                if(ele?.slot_selected !== '-1') {
                  let slotData = await this.readReplicaEventSlotsTimingsRepository.findOne({where: { id: Number(ele.slot_selected), status: 1}});                                                     
                  if (!slotData) {
                    ele['slotTiming'] = slotData;
                  }
                }
                else{
                  ele['slotTiming'] = null;
                }
              }));   
            }                           
            userBooking = userBooking.filter((ele)=> ele.hasOwnProperty('slotTiming'));
            if(userBooking.length){
              resultData['bookings'] = userBooking;
            }
          }  
          return resultData;
    }
    async listRecord(fields: any, condition: any, orderBy: any = null, user_id: any = null, tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = await this.readReplicaEventRepository.createQueryBuilder('event')
        .leftJoinAndMapOne(
          'event.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = event.organization_id AND company.status = 1`,
        )
        .leftJoinAndMapMany(
          'event.companies',
          tableConstant.EVENTS.TBL_EV_GLOBAL_EVENTS,
          'global_events',
          `global_events.event_id = event.id AND event.organization_id = 0`,
        )
        .leftJoinAndMapOne(
          'global_events.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'companie',
          `companie.id = global_events.organization_id AND companie.status = 1`,
        )
      .leftJoinAndMapOne(
          'event.slot',
          tableConstant.EVENTS.TBL_EV_SLOTS,
          'slot',
          `slot.ev_events_id = event.id AND slot.status = 1`,
        )
        .leftJoinAndMapOne(
          'event.category',
          tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
          'category',
          `category.id = event.category_id AND category.status = 1`,
        );
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_LOCATIONS)) {
          query = query.leftJoinAndMapOne(
              'event.ev_location',
              tableConstant.EVENTS.TBL_EV_LOCATIONS,
              'ev_location',
              `ev_location.ev_events_id = event.id`,
          )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_DEPARTMENTS)) {
          query = query.leftJoinAndMapOne(
              'event.ev_department',
              tableConstant.EVENTS.TBL_EV_DEPARTMENTS,
              'ev_department',
              `ev_department.ev_events_id = event.id`,
          )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS)) {
          query = query
            .leftJoinAndMapMany(
              'event.userBookingList',
              tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
              'userBookingList',
              `event.id = userBookingList.ev_events_id AND userBookingList.status = 1 AND userBookingList.ev_user_id = ${user_id}`,
            )
            .leftJoinAndMapOne(
              'userBookingList.user',
              tableConstant.TBL_USERS,
              'user',
              `userBookingList.ev_user_id = user.id AND userBookingList.status = 1`,
            );
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EXTERNAL_LINK_USER)) {
          query = query
            .leftJoinAndMapOne(
                'event.elu',
                tableConstant.EVENTS.TBL_EV_EXTERNAL_LINK_USER,
                'elu',
                `elu.event_id = event.id`,
            )
            .leftJoinAndMapOne(
              'elu.linkuser',
              tableConstant.TBL_USERS,
              'linkuser',
              `elu.user_id = linkuser.id AND elu.status = 1`,
            );
        }
        if(user_id){
          query = query
            .leftJoinAndMapOne(
              'event.userBookingList',
              tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
              'userBookingList',
              `event.id = userBookingList.ev_events_id AND userBookingList.status = 1 AND userBookingList.ev_user_id = ${user_id}`,
            );
        }  
        query = query.where(condition)
            .select(fields)
            .orderBy(`event.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        if(fields.includes('global_events') || user_id){
          return query.getMany()
        }
        else{
          return query.getRawMany();
        }
    }
    async eventsList(fields: any, condition: any, orderBy: any = null,tableData: any[] = [], user_id: any = null) {
      if (!orderBy) {
          orderBy = { 'event.id': 'DESC' };
      }
      let queryResult: any = await this.readReplicaEventRepository.createQueryBuilder('event')
      if (tableData.includes(tableConstant.EVENTS.TBL_EV_SLOTS)) {
          queryResult = queryResult.leftJoinAndMapOne(
            'event.slot',
            tableConstant.EVENTS.TBL_EV_SLOTS,
            'slot',
            `slot.ev_events_id = event.id AND slot.status = 1`,
          )
      }
      if (tableData.includes(tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS)) {
          queryResult = queryResult.leftJoinAndMapOne(
            'event.userBookingList',
            tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
            'userBookingList',
            user_id ? `event.id = userBookingList.ev_events_id AND userBookingList.status = 1 AND userBookingList.ev_user_id = ${user_id}` : `event.id = userBookingList.ev_events_id AND userBookingList.status = 1`,
          )
      }
      queryResult = await queryResult.select(fields)
          .where(condition)
          .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
          .getMany();
      return queryResult;
  }
    async eventsListRecord(fields: any, condition: any, orderBy: any = null,tableData: any[] = []) {
        if (!orderBy) {
            orderBy = { 'event.id': 'DESC' };
        }
        let queryResult: any = await this.readReplicaEventRepository.createQueryBuilder('event')
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'event.ubl',
                tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
                'ubl',
                `ubl.ev_events_id = event.id`,
            )
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_EXTERNAL_LINK_USER)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'event.elu',
                tableConstant.EVENTS.TBL_EV_EXTERNAL_LINK_USER,
                'elu',
                `elu.event_id = event.id`,
            )
        }
        queryResult = await queryResult.select(fields)
            .where(condition)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
        return queryResult;
    }
    async eventsFindOne(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaEventRepository.findOne({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async getOrganizationFromEventID(condition: any) {
      return await this.readReplicaEventRepository.createQueryBuilder('event')
          .where(condition)
          .select(['event.organization_id'])
          .getOne();
  }
  async coachListRecord(condition: any, orderBy: any = null, fields: any, date: any = null, groupBy: any = null) {
    if(!orderBy) {
        orderBy = { id: 'DESC' };
    }
    let query = await this.readReplicaEventRepository.createQueryBuilder('event')
    .innerJoinAndMapOne(
      'event.slotTiming',
      tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS,
      'slotTiming',
      `slotTiming.ev_events_id = event.id AND slotTiming.slotdate In(${date.map((ele)=> `"${ele}"`)}) AND slotTiming.status = 1`,
    )
    .leftJoinAndMapOne(
      'event.userBookingList',
      tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
      'userBookingList',
      `slotTiming.id = userBookingList.slot_selected`,
    )
    .innerJoinAndMapOne(
      'event.user',
      tableConstant.TBL_USERS,
      'user',
      `userBookingList.ev_user_id = user.id AND userBookingList.status = 1`,
    )
    .innerJoinAndMapOne(
      'user.userSetting',
      tableConstant.TBL_USERS_SETTINGS,
      'userSetting',
      `userSetting.user_id = user.id`,
    )
    .innerJoinAndMapOne(
      'user.company',
      tableConstant.COMPANIES.TBL_COMPANY,
      'company',
      `company.id = user.org_id`,
    );
    query = query.where(condition)
        .select(fields)
        .orderBy(`event.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
      if(groupBy){
        return await query
          .groupBy(groupBy)
          .getMany(); /// may be we have to use getRawMany()
      }
      else{
        return await query
        .getMany();
      }
  }
  async coachSlots(condition: any, paginationParam: PaginateWithCoachesInput) {
    const paginateObj = this.commonArrayService.getPaginationVar(
      paginationParam.page || 1,
      paginationParam.limit,
  );
    let queryResult = await this.readReplicaEventRepository.createQueryBuilder('event')
      .innerJoinAndMapOne(
        'event.slot',
        tableConstant.EVENTS.TBL_EV_SLOTS,
        'slot',
        `slot.ev_events_id = event.id`,
      )
      .innerJoinAndMapOne(
        'slot.company',
        tableConstant.COMPANIES.TBL_COMPANY,
        'company',
        `slot.organization_id = company.id`,
      )
      .where(condition)
      .select(['slot','company.company_name','event.event_name','event.id'])  
      .take(paginateObj.take)
      .skip(paginateObj.skip)
      .getManyAndCount();    
      const [result, total] = queryResult;
      return this.commonArrayService.paginationResponse(result, total, paginateObj);
  }
  async userEventList(condition: any, orderBy: any = null, fields: any = ['es'], user_id: any, category_condition: any = '') {
      if (!orderBy) {
          orderBy = { id: 'DESC' };
      }
      let query: any = await this.readReplicaEventRepository.createQueryBuilder('event')
          .leftJoinAndMapMany(
            'event.slot',
            tableConstant.EVENTS.TBL_EV_SLOTS,
            'es',
            `es.ev_events_id = event.id AND es.status = 1`,
          )
          .leftJoinAndMapMany(
              'es.userBookingList',
              tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
              'userBookingList',
              `userBookingList.ev_slots_id = es.id AND userBookingList.ev_user_id = ${user_id} AND userBookingList.status = 1`,
          )
          .leftJoinAndMapOne(
              'event.category',
              tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
              'category',
              `category.id = event.category_id AND category.status = 1`,
          );
      if (category_condition == true) {
          fields.push('s_users');
          query.leftJoinAndMapOne(
            'event.s_users',
            tableConstant.TBL_USERS,
            's_users',
            `s_users.email = event.user_email`,
          )
      } else {
          fields.push('slotsTimings');
          query.leftJoinAndMapOne(
            'userBookingList.slotsTimings',
            tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS,
            'slotsTimings',
            `slotsTimings.id = userBookingList.slot_selected AND slotsTimings.status = 1`,
          )
      }
      return await query
          .select(fields)
          .where(condition)
          .orderBy(`es.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
          .getMany();
  }
  async userEventList1(condition: any, orderBy: any = null, fields: string[] = ['event'], joinCondition: any = '') {
      if (!orderBy) {
          orderBy = { id: 'DESC' };
      }
      return await this.readReplicaEventRepository.createQueryBuilder('event')
        .leftJoinAndMapMany(
          'event.slot',
          tableConstant.EVENTS.TBL_EV_SLOTS,
          'es',
          joinCondition,
        )
        .select(fields)
        .where(condition)
        .orderBy(`event.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
  }
  async listRecordPagination(fields: string[] = ['event'], condition: any, paginationParam: PaginateWithCoachesInput, user_id: any = null) {
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
              : 'event.created';
      let query = await this.readReplicaEventRepository.createQueryBuilder('event')
      .leftJoinAndMapOne(
          'event.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = event.organization_id AND company.status = 1`,
        )
        .leftJoinAndMapMany(
          'event.companies',
          tableConstant.EVENTS.TBL_EV_GLOBAL_EVENTS,
          'global_events',
          `global_events.event_id = event.id AND event.organization_id = 0`,
        )
        .leftJoinAndMapOne(
          'global_events.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'companie',
          `companie.id = global_events.organization_id AND companie.status = 1`,
        )
      .leftJoinAndMapOne(
          'event.slot',
          tableConstant.EVENTS.TBL_EV_SLOTS,
          'slot',
          `slot.ev_events_id = event.id AND slot.status = 1`,
        )
        .leftJoinAndMapOne(
          'event.category',
          tableConstant.EVENTS.TBL_EV_EVENT_CATEGORY,
          'category',
          `category.id = event.category_id AND category.status = 1`,
        );
        if(user_id){
          query = query
            .leftJoinAndMapOne(
              'event.userBookingList',
              tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
              'userBookingList',
              `event.id = userBookingList.ev_events_id AND userBookingList.status = 1 AND userBookingList.ev_user_id = ${user_id}`,
            );
        }
      let queryResult = await query.where(condition)
        .select([])
        .addSelect(fields)
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .getManyAndCount();
      const [result, total] = queryResult;
      return this.commonArrayService.paginationResponse(result, total, paginateObj);
  }
  async addNotification(eventslotData: any, req: Request) {
    try {
        if(eventslotData?.type == 'add' || eventslotData?.type == 'update'){
            let eventDetails = await this.findOne({id: eventslotData['event_id']});
            if(eventslotData?.type == 'update'){
                await this.notificationsController.removeNotification({org_id: eventDetails?.organization_id, slot_id: eventslotData?.id, event_id: eventDetails?.['event_id']}, req as any);
            }
            let message = `${eventDetails?.event_name} Event`;
            let notificationData = {
                org_id: eventDetails.organization_id,
                user_id: 0,
                title: "Upcoming Event",
                message: `${eventDetails?.event_name} Event`,
                type: 1,
                module_name: 'Events',
                submodule_name: 'Event Slot',
                metadata: {
                    slot_id: eventslotData?.id,
                    event_id: eventDetails?.['event_id'],
                    category_id: eventDetails?.category_id,
                    logo: eventslotData?.logo,
                    url: eventslotData?.url,
                    notification_date: null,
                    notification_sent: 0,
                    notification_sent_count: 0,
                },
            }
            if(eventslotData?.start_date || eventslotData?.end_date){ 
                let startDate
                let endDate
                if(eventslotData?.start_date){ 
                    startDate = this.commonDateService.getTodayDate(eventslotData?.start_date).format('YYYY-MM-DD');
                    endDate = this.commonDateService.getTodayDate(eventslotData?.start_date).add(1, 'days').format('YYYY-MM-DD');
                    notificationData['metadata']['notification_date'] = startDate;
                    notificationData['metadata']['notification_sent'] = 0;
                    notificationData['metadata']['reg_start_date'] = startDate;
                    notificationData['message'] = message + ' Registration Start Today';
                    await this.notificationsController.sendNotification(0, notificationData, req as any);

                    notificationData['metadata']['notification_date'] = endDate;
                    notificationData['metadata']['reg_start_date_before'] = endDate;
                    notificationData['message'] = message + ' Registration Start Yesterday';
                    await this.notificationsController.sendNotification(0, notificationData, req as any);
                }
                if(eventslotData?.end_date){
                    notificationData['title'] = 'Event Registration';
                    let endDate = this.commonDateService.getTodayDate(eventslotData?.end_date).format('YYYY-MM-DD');
                    notificationData['metadata']['notification_date'] = endDate;
                    notificationData['metadata']['notification_sent'] = endDate;
                    notificationData['metadata']['notification_sent'] = 1;
                    notificationData['metadata']['end_date'] = endDate;
                    notificationData['message'] = message + ' End Today';
                    await this.notificationsController.sendNotification(0, notificationData, req as any);

                    endDate = this.commonDateService.getTodayDate(eventslotData?.end_date).subtract(1, 'days').format('YYYY-MM-DD');
                    notificationData['metadata']['notification_date'] = endDate;
                    notificationData['metadata']['end_date_tomm'] = endDate;
                    notificationData['message'] = message + ' ends Tomorrow';
                    await this.notificationsController.sendNotification(0, notificationData, req as any);
                }
            }     
        }
        return;
    }
    catch (error) {
        await this.activityLogService.error_log(req?.['tokenUser']?.id,req?.['originalUrl'], error?.message, error, req);
        return;
    }
  }
    async getEventDetailsForCampaign(e_id: number, org_id: number): Promise<any> {
        try {
            const result = await this.readReplicaEventRepository
                .createQueryBuilder('e')
                .leftJoin('ev_slots', 's', 's.ev_events_id = e.id')
                .select([
                    'CONCAT(e.event_location, ", ", e.event_address, ", ", e.event_city, ", ", e.event_state, ", ", e.event_zipcode) as Address',
                    'TRIM(e.event_name) as EventName',
                    'CASE WHEN e.start_date IS NOT NULL AND e.start_date != "" THEN DATE_FORMAT(e.start_date, "%D %M, %Y") ELSE DATE_FORMAT(MIN(s.start_date), "%D %M, %Y") END AS StartDate',
                    'CASE WHEN e.end_date IS NOT NULL AND e.end_date != "" THEN DATE_FORMAT(e.end_date, "%D %M, %Y") ELSE DATE_FORMAT(MAX(s.end_date), "%D %M, %Y") END AS EndDate'
                ])
                .where('e.id = :e_id', { e_id })
                .andWhere('e.organization_id = :org_id', { org_id })
                .groupBy('e.id')
                .getRawOne();

            if (result) {
                return {
                    EventName: result.EventName,
                    Address: result.Address,
                    StartDate: result.StartDate,
                    EndDate: result.EndDate
                };
            }

            return {};
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
