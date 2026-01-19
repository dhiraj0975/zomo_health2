import {
    appConstant,
    BaseService,
    CommonArrayService,
    EventUserBookingListsEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventReportInput } from '../eventreport/input/eventreport.input';
@Injectable()
export class EventUserBookingListsService extends BaseService<EventUserBookingListsEntity> {
    constructor(
        @InjectRepository(
            EventUserBookingListsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaEventUserBookingListsRepository: Repository<EventUserBookingListsEntity>,
        @InjectRepository(
            EventUserBookingListsEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaEventUserBookingListsRepository: Repository<EventUserBookingListsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaEventUserBookingListsRepository,
            writeReplicaEventUserBookingListsRepository,
            'userBookingLists',
            commonArrayService,
        );
    }
    async reportEventsList(
        fields: any,
        condition: any,
        paginationParam: EventReportInput,
        tableData: any[] = [],
    ) {
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
                : 'userBooking.registration_date';
        let queryResult: any =
            await this.readReplicaEventUserBookingListsRepository
                .createQueryBuilder('userBooking')
                .leftJoinAndMapOne(
                    'userBooking.event',
                    tableConstant.EVENTS.TBL_EV_EVENTS,
                    'event',
                    `event.id = userBooking.ev_events_id AND event.status = 1`,
                )
                .leftJoinAndMapOne(
                    'userBooking.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = userBooking.ev_user_id AND user.status = 1`,
                )
                .leftJoinAndMapOne(
                    'user.usersetting',
                    tableConstant.TBL_USERS_SETTINGS,
                    'usersetting',
                    `usersetting.user_id = user.id`,
                )
                .leftJoinAndMapOne(
                    'user.department',
                    tableConstant.COMPANIES.TBL_DEPARTMENT,
                    'department',
                    `department.id = user.department_id AND department.status = 1 AND department.deleted = 0`,
                )
                .leftJoinAndMapOne(
                    'user.Location',
                    tableConstant.COMPANIES.TBL_LOCATION,
                    'Location',
                    `Location.id = user.location AND Location.status = 1 AND Location.deleted = 0`,
                );
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_SLOTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'userBooking.slot',
                tableConstant.EVENTS.TBL_EV_SLOTS,
                'slot',
                `slot.id = userBooking.ev_slots_id AND slot.status = 1`,
            );
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'userBooking.slotstimings',
                tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS,
                'slotstimings',
                `slotstimings.id = userBooking.slot_selected AND slotstimings.status = 1`,
            );
        }
        if (tableData.includes(tableConstant.COMPANIES.TBL_COMPANY)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'userBooking.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = userBooking.organization_id AND company.status = 1`,
            );
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_LOCATIONS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'event.ev_location',
                tableConstant.EVENTS.TBL_EV_LOCATIONS,
                'ev_location',
                `ev_location.ev_events_id = event.id`,
            );
        }
        if (tableData.includes(tableConstant.EVENTS.TBL_EV_DEPARTMENTS)) {
            queryResult = queryResult.leftJoinAndMapOne(
                'event.ev_department',
                tableConstant.EVENTS.TBL_EV_DEPARTMENTS,
                'ev_department',
                `ev_department.ev_events_id = event.id`,
            );
        }
        queryResult = queryResult
            .select(fields)
            .where(condition)
            .orderBy(orderBy, <any>order);
        if (paginationParam.result_type == 1) {
            queryResult = await queryResult
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .getManyAndCount();
            const [result, total] = queryResult;
            return this.commonArrayService.paginationResponse(
                result,
                total,
                paginateObj,
            );
        } else {
            queryResult = await queryResult.getMany();
            return queryResult;
        }
    }
}
