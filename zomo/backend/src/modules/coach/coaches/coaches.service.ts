import {
  appConstant,
  BaseService,
  CoachesEntity,
  CommonArrayService,
  CommonFileService,
  tableConstant
} from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithCoachesInput } from '../input';
@Injectable()
export class CoachesService extends BaseService<CoachesEntity>{
  constructor(
      @InjectRepository(CoachesEntity, appConstant.READ_REPLICA.toLowerCase())
      private readonly readReplicaCoachRepository: Repository<CoachesEntity>,
      @InjectRepository(CoachesEntity, appConstant.MAIN.toLowerCase())
      private readonly writeReplicacoachRepository: Repository<CoachesEntity>,
      commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
  ) {
      super(readReplicaCoachRepository, writeReplicacoachRepository, 'coach', commonArrayService );
  }
  async paginateList(condition: any, paginationParam: PaginateWithCoachesInput) {
      const paginateObj = this.commonArrayService.getPaginationVar(
          paginationParam.page || 1,
          paginationParam.limit,
      );
      const order: string =
          paginationParam && paginationParam.order
              ? paginationParam.order
              : 'DESC';
      const orderBy: string =
          paginationParam && paginationParam.order_by
              ? `coach.${paginationParam.order_by}`
              : 'coach.id';
      const queryResult = await this.readReplicaCoachRepository.createQueryBuilder('coach')
          .leftJoinAndMapOne(
            'coach.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = coach.org_id`,
            /*Don't ADD status files enable disable*/
          )
          .leftJoinAndMapOne(
              'coach.company_setting',
              tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
              'company_setting',
              `coach.org_id = company_setting.org_id`,
          )
        .leftJoinAndMapOne(
          'company.company_type',
          tableConstant.COMPANIES.TBL_COMPANY_TYPE,
          'company_type',
          `company_type.id = company.companytype_id`,
        )
        .leftJoinAndMapOne(
          'coach.user',
          tableConstant.TBL_USERS,
          'user',
          `user.id = coach.user_id`,
        )
        .leftJoinAndMapOne(
          'coach.coach_manager',
          tableConstant.TBL_USERS,
          'coach_manager',
          `coach_manager.id = coach.coach_manager_id`,
        )
          .where(condition)
          .groupBy('company.id')
          .orderBy(orderBy, <any>order)
          .take(paginateObj.take)
          .skip(paginateObj.skip)
          .getManyAndCount();
      const [result, total] = queryResult;
      return this.commonArrayService.paginationResponse(result, total, paginateObj);
  }
  async findOne(condition: any) {
      return await this.readReplicaCoachRepository.createQueryBuilder('coach').leftJoinAndMapOne(
          'coach.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = coach.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
          'company.company_type',
          tableConstant.COMPANIES.TBL_COMPANY_TYPE,
          'company_type',
          `company_type.id = company.companytype_id`,
        )
        .leftJoinAndMapOne(
          'coach.user',
          tableConstant.TBL_USERS,
          'user',
          `user.id = coach.user_id`,
        )
        .leftJoinAndMapOne(
          'coach.coach_manager',
          tableConstant.TBL_USERS,
          'coach_manager',
          `coach_manager.id = coach.coach_manager_id`,
        )
          .where(condition)
          .orderBy(`coach.id`, 'DESC')
          .getOne();
  }
  async listRecord(condition: any, orderBy: any = null, field: any[] = [
    'coach',
    'company.id','company.company_name','company.code','company.city','company.state','company.country','company.company_name','company.company_logo',
    'coach_manager.id','coach_manager.code','coach_manager.first_name','coach_manager.last_name',
    'user.id','user.code','user.first_name','user.last_name',
  ], groupBy: any = null, paginate: boolean = false) {
      if (!orderBy) {
          orderBy = { id: 'DESC' };
      }
      let query = this.readReplicaCoachRepository.createQueryBuilder('coach')
      .leftJoinAndMapOne(
          'coach.company',
          tableConstant.COMPANIES.TBL_COMPANY,
          'company',
          `company.id = coach.org_id`,
          /* status condition remove global coach side listing company enable disable both show*/
        )
        .leftJoinAndMapOne(
          'company.company_type',
          tableConstant.COMPANIES.TBL_COMPANY_TYPE,
          'company_type',
          `company_type.id = company.companytype_id`,
        )
        .leftJoinAndMapOne(
          'coach.user',
          tableConstant.TBL_USERS,
          'user',
          `user.id = coach.user_id`,
        )
        .leftJoinAndMapOne(
          'coach.coach_manager',
          tableConstant.TBL_USERS,
          'coach_manager',
          `coach_manager.id = coach.coach_manager_id`,
        )
          .where(condition)
          .select(field)
          .orderBy(`coach.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        if(groupBy){
            return await query
              .groupBy(groupBy)
              .getMany();
        }
        else{
          return await query
          .getMany();
        }
  }
  async save(data: any) {
      const savedResult = this.writeReplicacoachRepository.create(data);
      return await this.writeReplicacoachRepository.insert(savedResult);
  }
  async update(condition: any, data: any) {
    data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicacoachRepository.metadata);
      return await this.writeReplicacoachRepository.createQueryBuilder('coach')
          .update(CoachesEntity)
          .set(data)
          .where(condition)
          .execute();
  }
  async delete(condition: any) {
      await this.writeReplicacoachRepository.delete(condition);
  }
  async coachList(condition: any, orderBy: any = null, field: any[] = [
    'coach',
    'company.id','company.company_name','company.code','company.city','company.state','company.country','company.company_name','company.company_logo',
    'user.id','user.code','user.first_name','user.last_name',
  ], user_condition: any = null, user_setting_condition: any = null, date: any = null, groupBy: any = null) {
      if (!orderBy) {
          orderBy = { id: 'DESC' };
      }
      let userCondition = `user.id = coach.user_id`;
      let userSettingCondition = `userSetting.user_id = coach.user_id`;
      if(user_condition){
        userCondition = user_condition;
      }
      if(user_setting_condition){
        userSettingCondition = user_setting_condition;
      }
      let query = this.readReplicaCoachRepository.createQueryBuilder('coach')
      .innerJoinAndMapOne(
        'coach.user',
        tableConstant.TBL_USERS,
        'user',
        userCondition,
      )
      .innerJoinAndMapOne(
        'user.userSetting',
        tableConstant.TBL_USERS_SETTINGS,
        'userSetting',
        userSettingCondition,
      )
      .innerJoinAndMapMany(
        'coach.userBookingList',
        tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
        'userBookingList',
        `user.id = userBookingList.ev_user_id AND userBookingList.status = 1`,
      )
      .innerJoinAndMapOne(
        'userBookingList.bookingUser',
        tableConstant.TBL_USERS,
        'bookingUser',
        `bookingUser.id = userBookingList.ev_user_id AND bookingUser.status = 1`,
      )
      .innerJoinAndMapOne(
        'bookingUser.bookingUserSetting',
        tableConstant.TBL_USERS_SETTINGS,
        'bookingUserSetting',
        `bookingUser.id = bookingUserSetting.user_id AND bookingUserSetting.status = 1`,
      )
      .innerJoinAndMapOne(
        'bookingUser.company',
        tableConstant.COMPANIES.TBL_COMPANY,
        'company',
        `company.id = bookingUser.org_id`,
      )
      .innerJoinAndMapOne(
          'userBookingList.events',
          tableConstant.EVENTS.TBL_EV_EVENTS,
          'events',
          `events.id = userBookingList.ev_events_id`,
        )
      .innerJoinAndMapOne(
          'userBookingList.slot',
          tableConstant.EVENTS.TBL_EV_SLOTS,
          'slot',
          `events.id = slot.ev_events_id AND slot.id = userBookingList.ev_slots_id`,
        )
        .innerJoinAndMapOne(
            'userBookingList.slotTiming',
            tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS,
            'slotTiming',
            `slotTiming.id = userBookingList.slot_selected AND slotTiming.slotdate In(${date.map((ele)=> `"${ele}"`)}) AND slotTiming.status = 1`,
        )
        .where(condition)
        .select(field)
        .orderBy(`coach.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        let queryData;
        let result =[];
        if(groupBy){
          queryData =  await query.groupBy(groupBy).getMany();
        }else{
          queryData =  await query.getMany();
        }
        if(queryData && queryData.length > 0){
          for(const coachData of queryData){
            let userBookingList = coachData?.userBookingList;
            delete coachData?.userBookingList;
            delete coachData?.userBookingList;
            for(const bookingData of userBookingList){
              let userBooking = structuredClone(bookingData);
              delete userBooking?.bookingUser;
              delete userBooking?.events;
              delete userBooking?.slotTiming;
              bookingData.bookingUser['userSetting'] = bookingData?.bookingUser?.['bookingUserSetting'];
              delete bookingData?.bookingUser?.['bookingUserSetting']
              result.push({
                ...coachData,
                user: bookingData?.bookingUser,
                event: bookingData?.events,
                slotTiming: bookingData?.slotTiming,
                userBookingList: userBooking,
              });
            }
          }
        }
        return result ?? queryData;
  }
  async coachSlots(condition: any, paginationParam: PaginateWithCoachesInput) {
    const paginateObj = this.commonArrayService.getPaginationVar(
      paginationParam.page || 1,
      paginationParam.limit,
  );
    let queryResult = await this.readReplicaCoachRepository.createQueryBuilder('coach')
      .innerJoinAndMapOne(
        'coach.slot',
        tableConstant.EVENTS.TBL_EV_SLOTS,
        'slot',
        `slot.organization_id = coach.org_id`,
      )
      .innerJoinAndMapOne(
        'slot.company',
        tableConstant.COMPANIES.TBL_COMPANY,
        'company',
        `slot.organization_id = company.id`,
      )
      .innerJoinAndMapOne(
        'slot.event',
        tableConstant.EVENTS.TBL_EV_EVENTS,
        'event',
        `slot.ev_events_id = event.id`,
      )
      .where(condition)
      .select(['coach','slot','company.company_name','event.event_name'])      
      .take(paginateObj.take)
      .skip(paginateObj.skip)
      .getManyAndCount();
      const [result, total] = queryResult;
    return this.commonArrayService.paginationResponse(result, total, paginateObj);
  }
  async assignCoachListRecord(fields: any[] = [],condition: any, orderBy: any = null,tableData: any[] = [], paginate = false, paginationParam: PaginateWithCoachesInput = null) {
      if (!orderBy) {
          orderBy = { id: 'DESC' };
      }
      let queryResult: any = this.readReplicaCoachRepository.createQueryBuilder('coach')
      if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
          queryResult = queryResult.innerJoinAndMapOne(
              'coach.company',
              tableConstant.COMPANIES.TBL_COMPANY,
              'company',
              `company.id = coach.org_id`,
          )
          .leftJoinAndMapOne(
            'company.company_type',
            tableConstant.COMPANIES.TBL_COMPANY_TYPE,
            'company_type',
            `company_type.id = company.companytype_id`,
          )
      }
      if (tableData.includes(tableConstant.COMPANIES.TBL_LOCATION)) {
          queryResult = queryResult.leftJoinAndMapOne(
              'coach.location',
              tableConstant.COMPANIES.TBL_LOCATION,
              'location',
              `coach.org_id = location.company_id AND coach.location = location.id`,
          )
      }
      if (tableData.includes(tableConstant.COMPANIES.TBL_DEPARTMENT)) {
          queryResult = queryResult.leftJoinAndMapOne(
              'coach.department',
              tableConstant.COMPANIES.TBL_DEPARTMENT,
              'department',
              `coach.org_id = department.company_id AND coach.department = department.id`,
          )
      }
      if(paginate){
          const paginateObj = this.commonArrayService.getPaginationVar(
              paginationParam.page || 1,
              paginationParam.limit,
          );
          const order: string =
              paginationParam && paginationParam.order
                  ? paginationParam.order
                  : 'DESC';
          const orderBy: string =
              paginationParam && paginationParam.order_by
                  ? `coach.${paginationParam.order_by}`
                  : 'coach.id';
        let resultData = await queryResult
            .where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = resultData;
        queryResult = this.commonArrayService.paginationResponse(result, total, paginateObj);
      }
      else{
        queryResult = await queryResult.select(fields)
                  .where(condition)
                  .orderBy(`coach.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        queryResult = await queryResult.getMany();
      }
      return queryResult
  }
  async getAssignOrgList(condition: any, fields: any = ['coach'], joinTale: any = [], groupBy: any = null) {
    let query = this.readReplicaCoachRepository.createQueryBuilder('coach');
    if(joinTale && joinTale.length > 0){
        for(let i = 0; i < joinTale.length; i++){
            if(joinTale[i].type == 'INNER'){
                query = query.innerJoinAndMapOne(
                    `${joinTale[i].connect}.${joinTale[i].alias}`,
                    joinTale[i].table,
                    joinTale[i].alias,
                    joinTale[i].on,
                );
            }else{
                query = query.leftJoinAndMapOne(
                    `${joinTale[i].connect}.${joinTale[i].alias}`,
                    joinTale[i].table,
                    joinTale[i].alias,
                    joinTale[i].on,
                );
            }
        }
    }
    query = query.where(condition)
    .select(fields)
    .orderBy({
        'coach.id': 'ASC',
    });
    if(groupBy){
      query =  query.groupBy(groupBy);
    }
    return await query.getMany();
  }
  async checkCoach(condition:any = null, field:any = ['coach']){
      try{
        return await this.readReplicaCoachRepository.createQueryBuilder('coach')
          .where(condition)
          .select(field)
          .getMany();
      }catch (error) {
          throw new Error(error.message); 
      }
  }
  async globalCoachList(condition: any, orderBy: any = null, field: any[] = ['coach'], groupBy: any = null) {
      if (!orderBy) {
          orderBy = { id: 'DESC' };
      }
      let query = this.readReplicaCoachRepository.createQueryBuilder('coach')
        .where(condition)
        .select(field)
        .orderBy(`coach.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        return await query.getMany();
  }
}