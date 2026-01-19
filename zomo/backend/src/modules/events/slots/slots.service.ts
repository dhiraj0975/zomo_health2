import { PaginateWithCoachesInput } from '@/modules/coach/input';
import { appConstant, CommonArrayService, CommonDateService, CommonFileService, EventSlotsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from "express";
import * as moment from 'moment-timezone';
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
import { EventSlotsTimingsService } from '../slotstimings/slotstimings.service';
@Injectable()
export class EventSlotsService {
    constructor(
        @InjectRepository(EventSlotsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventSlotsRepository: Repository<EventSlotsEntity>,
        @InjectRepository(EventSlotsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventSlotsRepository: Repository<EventSlotsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly eventSlotsTimingsService: EventSlotsTimingsService,
        private readonly activityLogService: ActivityLogService,
    ) { }
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
                : 'es.created';
        var queryResult = await this.readReplicaEventSlotsRepository.createQueryBuilder('es')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaEventSlotsRepository.create(data);
        return await this.writeReplicaEventSlotsRepository.insert(savedResult);
    }
    async saveSlot(slotData: any){
        try{
            // Define arrays similar to PHP arrays
            const DaybasismonthbasisTypearray = { 'first': '1', 'second': '2', 'third': '3', 'fourth': '4', 'fifth': '5', 'last': '6' };
            const DaybasismonthbasisDayarray = { 'monday': '1', 'tuesday': '2', 'wednesday': '3', 'thursday': '4', 'friday': '5', 'saturday': '6', 'sunday': '7' };
            // Adjust slotData based on type (like the original code in PHP)
            const dividingSlotTypes = {
            '1': { slot_interval: '', slot_total: '' },
            '2': { slot_interval: slotData.slot_interval, slot_total: '' },
            '3': { slot_interval: '', slot_total: slotData.slot_total },
            };
            const updatedSlotData = {
            ...slotData,
            ...dividingSlotTypes[slotData.dividing_slot_type],
            attendee_limit: slotData.attendee_limit_type == '2' ? slotData.attendee_limit : '0',
            };
            const recurringPatternTypes = {
            '2': { weekly_basis_day: slotData.weekly_basis_day ? slotData.weekly_basis_day : '0' },
            '5': { weekly_basis_day_bio: slotData.weekly_basis_day_bio ? slotData.weekly_basis_day_bio : '0' },
            '3': {
                monthly_basis: slotData.monthly_basis,
                monthly_date_basis: slotData.monthly_basis == '1' ? slotData.monthly_date_basis : '0',
                monthly_basis_Type: slotData.monthly_basis == '2' ? slotData.monthly_basis_Type : '0',
                monthly_basis_day: slotData.monthly_basis == '2' ? slotData.monthly_basis_day : '0',
            },
            '4': { year_basis_day: slotData.year_basis_day, year_basis_month: slotData.year_basis_month },
            };
            // Merge the recurring pattern data into the updatedSlotData
            const finalSlotData = {
            ...updatedSlotData,
            ...recurringPatternTypes[slotData.recurring_pattern_type],
            };
            // Map monthly_basis_Type and monthly_basis_day using the Daybasismonthbasis arrays
            if (DaybasismonthbasisTypearray[finalSlotData.monthly_basis_Type]) {
            finalSlotData.monthly_basis_Type = DaybasismonthbasisTypearray[finalSlotData.monthly_basis_Type];
            }
            if (DaybasismonthbasisDayarray[finalSlotData.monthly_basis_day]) {
            finalSlotData.monthly_basis_day = DaybasismonthbasisDayarray[finalSlotData.monthly_basis_day];
            }
            // Set the date formats using moment.js
            finalSlotData.start_date = moment(slotData.start_date).format('YYYY-MM-DD');
            finalSlotData.end_date = moment(slotData.end_date).format('YYYY-MM-DD');
            finalSlotData.start_time = moment(slotData.start_time, 'HH:mm').format('HH:mm');
            finalSlotData.end_time = moment(slotData.end_time, 'HH:mm').format('HH:mm');
            if(finalSlotData.slot_total==''){
                delete finalSlotData.slot_total;
            }
            if(finalSlotData.attendee_limit==''){
                delete finalSlotData.attendee_limit;
            }
            if(!finalSlotData.slot_timezone){
                finalSlotData.slot_timezone = 1;
            }
            if(!finalSlotData.slot_hour){
                finalSlotData.slot_hour = '01:00:00';
            }
            let slot:any = await this.writeReplicaEventSlotsRepository.upsert([finalSlotData],['id']);
            slot = slot.generatedMaps[0];
            return slot;
        }catch (error) {
            throw new Error(error.message); 
        }
      }
    async  getDatePeriodData(
        startDate: string,
        endDate: string,
        patternType: any,
        weeklyDays: number[],
        weeklyDaysBio: number[],
        monthlyBasis: string,
        monthlyDateBasis: number,
        monthlyBasisType: string,
        monthlyBasisDay: number,
        yearBasisDay: number,
        yearBasisMonth: number,
      ) {
        try{
            const begin = moment(startDate);
            const end = moment(endDate).add(1, 'days'); // Include the end day in the range
            const datePeriodData: string[] = [];
            const tempBioEvent: Record<number, number> = {}; // To handle weekly days bio
            // Generate the date period
            let currentDate = begin.clone();
            while (currentDate.isBefore(end)) {
                // const monthlyDate = this.getFormattedDate(monthlyBasisType, monthlyBasisDay, currentDate);
                const monthlyDate = this.getNthWeekday(currentDate, monthlyBasisType, monthlyBasisDay);
                const formattedDate = currentDate.format('YYYY-MM-DD');
                const dayOfWeek = currentDate.isoWeekday(); // ISO weekday (1 = Monday, 7 = Sunday)
                switch (patternType.toString()) {
                    case '1':
                    // Add all dates in the period
                    datePeriodData.push(formattedDate);
                    break;
                    case '2':
                    // Weekly pattern, include days in the specified weeklyDays
                    if (weeklyDays.includes(dayOfWeek)) {
                        datePeriodData.push(formattedDate);
                    }
                    break;
                    case '5':
                    // Weekly bio pattern, handle alternation
                    if (weeklyDaysBio.includes(dayOfWeek)) {
                        if (!(dayOfWeek in tempBioEvent) || tempBioEvent[dayOfWeek] == 1) {
                        datePeriodData.push(formattedDate);
                        tempBioEvent[dayOfWeek] = 0;
                        } else {
                        tempBioEvent[dayOfWeek] = 1;
                        }
                    }
                    break;
                    case '3':
                        // Monthly pattern, either based on a specific day or monthly basis
                    if (
                        (monthlyBasis == '1' && currentDate.date() == monthlyDateBasis) ||
                        (monthlyBasis == '2' &&
                        formattedDate == monthlyDate)
                    ) {
                        datePeriodData.push(formattedDate);
                    }
                    break;
                    case '4':
                    // Yearly pattern based on a specific day and month
                    if (formattedDate == moment(`${currentDate.year()}-${yearBasisMonth}-${yearBasisDay}`).format('YYYY-MM-DD')) {
                        datePeriodData.push(formattedDate);
                    }
                    break;
                }
                // Move to the next day
                currentDate.add(1, 'days');
            }
            return datePeriodData;
        }catch (error) {
            throw new Error(error.message); 
        }
      }
    getFormattedDate(monthlyBasisType, monthlyBasisDay, currentDate) {
        try{
            const monthlyBasisDayValues = {
                1: 'monday',
                2: 'tuesday',
                3: 'wednesday',
                4: 'thursday',
                5: 'friday',
                6: 'saturday',
                7: 'sunday',
            };
            const now = moment(currentDate); 
            const yearMonth = now.format("YYYY-MM"); 
            const firstDayOfMonth = moment(`${yearMonth}-01`); 
            let targetDate = firstDayOfMonth.clone();
            let weekCount = this.getWeeksInMonth(now.format("YYYY"), now.format("MM"));
            if(monthlyBasisType > weekCount && monthlyBasisType != 6){
                return "Invalid date";
            }
            if (monthlyBasisType === 6) {
                targetDate = moment(firstDayOfMonth).endOf('month'); 
                while (targetDate.day() !== monthlyBasisDay) {
                    targetDate.subtract(1, 'day');
                }
            } else {
                targetDate.add(monthlyBasisType - 1, 'weeks').endOf('week');
                let date = targetDate.clone().add(monthlyBasisType == 5 ? 5 : monthlyBasisType - 1, 'weeks');
                while (targetDate.day() !== monthlyBasisDay) {
                    targetDate.subtract(1, 'day');
                }
            }
            if (targetDate.month() !== firstDayOfMonth.month() || now.format("YYYY-MM-DD") != targetDate.format("YYYY-MM-DD")) {
                return "Invalid date";
            }
            return targetDate.format("YYYY-MM-DD");
        }catch (error) {
            throw new Error(error.message); 
        }
    }  
    getNthWeekday(currentDate, n, weekday) {
        try{
            const currentTime = moment(); 
            const now = moment(currentDate); 
            const yearMonth = now.format("YYYY-MM"); 
            const startDate = moment(`${yearMonth}-01`);
            let firstDay = startDate.clone().startOf('month'); 
            firstDay.day(weekday);
            if (firstDay.date() > 7) {
            firstDay.add(7, 'days');
            }
            let nthDay;
            if (n === 6) {
                const lastDayOfMonth = startDate.clone().endOf('month');
                nthDay = lastDayOfMonth.clone().day(weekday); 
                if (nthDay.isAfter(lastDayOfMonth)) {
                    nthDay.subtract(7, 'days');
                }
            } else {
                nthDay = firstDay.clone().add((n - 1) * 7, 'days');
            }
            if ((nthDay.month() !== startDate.month()) || (nthDay.isBefore(currentTime, 'day'))) {
            return 'Invalid date';
            }
            return nthDay.format("YYYY-MM-DD");
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    getWeeksInMonth(year, month) {
        const firstDay = moment([Number(year), Number(month) - 1]); 
        const lastDay = firstDay.clone().endOf('month'); 
        const firstWeekday = firstDay.day(); 
        const totalDays = lastDay.date(); 
        return Math.ceil((firstWeekday + totalDays) / 7);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventSlotsRepository.metadata);
        return await this.writeReplicaEventSlotsRepository.createQueryBuilder('es')
            .update(EventSlotsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaEventSlotsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaEventSlotsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async getSlotTimings(data: any, datePeriodData: any, req: Request) {
        try{
            const slotID = data.slot_id;
            if (data?.changedData) {
                const slotTimingData = await this.eventSlotsTimingsService.listRecord({ ev_events_id: data.ev_events_id, ev_slots_id: slotID });
                await Promise.all(slotTimingData.map(async (slotTiming) => await this.eventSlotsTimingsService.update({ id: slotTiming.id }, { status: 0 })))
                for (let slot of slotTimingData) {
                    this.activityLogService.create(slot, { status: 0 }, tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS, req.tokenUser?.id);
                }
            }
            const startDate = moment(data.start_date);
            const endDate = moment(data.end_date);
            const [startHours, startMinutes] = data.start_time ? data.start_time.split(':') : '00:00'.split(':')
            const [endHours, endMinutes] = data.end_time ? data.end_time.split(':') : '23:59'.split(':')
            const availableStartTime = { hour: parseInt(startHours), minute: parseInt(startMinutes) };
            const availableEndTime = { hour: parseInt(endHours), minute: parseInt(endMinutes) };
            const intervalInMinutes = parseInt(data.slot_interval);
            //let datePeriodData = [];
            let tempBioEvent = [];
            if (!datePeriodData.length) {
                return;
            }
            let slots = [];
            for (let i = 0; i < datePeriodData.length; i++) {
                const slotDate = datePeriodData[i];
                if (data['dividing_slot_type'] == '1') {
                    const slotstarttime = moment(data['start_time'], 'HH:mm');
                    const slotendtime = moment(data['end_time'], 'HH:mm');
                    const slotinterval = Math.round(Math.abs(moment(slotendtime, 'HH:mm').diff(moment(slotstarttime, 'HH:mm'), 'minutes')));
                    slots.push({ slotdate:`${slotDate}`,slotstarttime: `${data.start_time}`, slotendtime: `${data.end_time}`, slotinterval: slotinterval });
                } else if (data['dividing_slot_type'] == '2') {
                    slots.push(...this.commonDateService.generateTimeSlotsWithinAvailableHours(slotDate, slotDate, availableStartTime, availableEndTime, intervalInMinutes));
                } else if (data['dividing_slot_type'] == '3') {
                    slots.push(...this.commonDateService.generateTimeSlotsWithinAvailableHoursByCount(slotDate, slotDate, availableStartTime, availableEndTime, data.slot_total));
                }
            }
            if (slots.length) {
                this.eventSlotsTimingsService.processAndSaveSlotTimings(slots, data.ev_events_id, data.slot_id);
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['es'], slotTimeId: any = null) {
        try{
            if (!orderBy) {
                orderBy = { id: 'DESC' };
            }
            let query = await this.readReplicaEventSlotsRepository.createQueryBuilder('es')
            if (slotTimeId) {
                query = query
                    .leftJoinAndSelect(
                        qb => qb
                            .select('COUNT(ub.id) as totalAttendeeJoined, ub.ev_slots_id')
                            .from(tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS, 'ub')
                            .where(`ub.status = 1 AND ub.slot_selected = ${slotTimeId}`)
                            .groupBy('ub.ev_slots_id'),
                        'userBookingList',
                        'userBookingList.ev_slots_id = es.id'
                    )
                    .leftJoinAndSelect(tableConstant.EVENTS.TBL_EV_SLOTS_TIMINGS, 'slotTimings', `slotTimings.id = ${slotTimeId}`)
            }
            query = query
                .leftJoinAndSelect(tableConstant.EVENTS.TBL_EV_EVENTS, 'events', 'events.id = es.ev_events_id')
            query = query
                .where(condition)
                .select(fields)
                .orderBy(`es.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
            let data;
            if (slotTimeId) {
                data = await query.getRawMany();
                if (data && data.length) {
                    for (let i = 0; i < data.length; i++) {
                        data[i] = Object.keys(data[i]).reduce((result, key) => {
                            const newKey = key.startsWith('es_') ? key.slice(3) : key;
                            result[newKey] = data[i][key];
                            return result;
                        }, {});
                        data[i] = Object.keys(data[i]).reduce((result, key) => {
                            const newKey = key.startsWith('events_') ? key.slice(7) : key;
                            if (!result['events']) {
                                result['events'] = {};
                            }
                            result['events'][newKey] = data[i][key];
                            return result;
                        }, data[i]);
                        data[i] = Object.keys(data[i]).reduce((result, key) => {
                            const newKey = key.startsWith('slotTimings_') ? key.slice(12) : key;
                            if (!result['slotTimings']) {
                                result['slotTimings'] = {};
                            }
                            result['slotTimings'][newKey] = data[i][key];
                            return result;
                        }, data[i]);
                    }
                }
            }
            else {
                data = await query.getMany();
            }
            return data;
        }catch (error) {
            throw new Error(error.message); 
        }
    }
    async userEventSlots(condition: any, orderBy: any = null, fields: any = ['es'], user_id: any, eventCondition: any = '', category_condition: any = '') {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaEventSlotsRepository.createQueryBuilder('es')
            .leftJoinAndMapMany(
                'es.userBookingList',
                tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
                'userBookingList',
                `userBookingList.ev_slots_id = es.id AND userBookingList.ev_user_id = ${user_id} AND userBookingList.status = 1`,
            )
            .innerJoinAndMapOne(
                'es.event',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'event',
                `event.id = es.ev_events_id AND ${eventCondition}`,
            )
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
                `slotsTimings.id = userBookingList.slot_selected`,
            )
        }
        return await query
            .select(fields)
            .where(condition)
            .orderBy(`es.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
    async userEventSlotsData(
        condition: any,
        fields: string[] = ['es'],
        orderBy: any = { id: 'DESC' }
    ) {
        let data = await this.readReplicaEventSlotsRepository
            .createQueryBuilder('es')
            .leftJoinAndMapOne(
                'es.ev_events',
                tableConstant.EVENTS.TBL_EV_EVENTS,
                'ev_events',
                `ev_events.id = es.ev_events_id AND ev_events.status =1`,
            )
            .leftJoinAndMapOne(
                'ev_events.ev_location',
                tableConstant.EVENTS.TBL_EV_LOCATIONS,
                'ev_location',
                `ev_location.ev_events_id = ev_events.id AND ev_location.status =1`,
            )
            .leftJoinAndMapOne(
                'es.c_timezones',
                'c_timezones',
                'c_timezones',
                `c_timezones.id = ev_events.event_timezone`,
            )
            .where(condition)
            .select(fields)
            .orderBy(`es.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        return data.getMany();
    }

    async coachSlots(condition: any, paginationParam: PaginateWithCoachesInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
        paginationParam.page || 1,
        paginationParam.limit,
    );
        let queryResult = await this.writeReplicaEventSlotsRepository.createQueryBuilder('slot')
        .innerJoinAndMapOne(
            'slot.event',
            tableConstant.EVENTS.TBL_EV_EVENTS,
            'event',
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
        let [result, total] = queryResult;
        if(result.length){
            result = result.map(item => {
            const ele = item as any;
            const { event, ...slot } = ele;
            event.slot = slot;
            return event;
            });
        }
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
}
