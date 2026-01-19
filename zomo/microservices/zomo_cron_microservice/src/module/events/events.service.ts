import {
    appConstant,
    BaseService,
    CommonArrayService,
    EventEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class EventService extends BaseService<EventEntity> {
    constructor(
        @InjectRepository(EventEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventRepository: Repository<EventEntity>,
        @InjectRepository(EventEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventRepository: Repository<EventEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaEventRepository,
            writeReplicaEventRepository,
            'event',
            commonArrayService,
        );
    }

    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let resultData = await this.readReplicaEventRepository
            .createQueryBuilder('event')
            .leftJoinAndMapOne(
                'event.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = event.organization_id AND company.status = 1`,
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
            )
            .where(condition)
            .getOne();
        return resultData;
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
    async eventListRecord(
        fields: any,
        condition: any,
        orderBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaEventRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
