import { PaginateWithCoachesInput } from '@/modules/coach/input';
import { appConstant, CommonArrayService, CommonFileService, EventSlotsTimingsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class EventSlotsTimingsService {
    constructor(
        @InjectRepository(EventSlotsTimingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaEventSlotsTimingsRepository: Repository<EventSlotsTimingsEntity>,
        @InjectRepository(EventSlotsTimingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventSlotsTimingsRepository: Repository<EventSlotsTimingsEntity>,
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
                : 'est.created';
        let queryResult = await this.readReplicaEventSlotsTimingsRepository.createQueryBuilder('est')
        .leftJoinAndMapOne(
            'est.slot',
            tableConstant.EVENTS.TBL_EV_SLOTS,
            'slot',
            `slot.id = est.ev_slots_id`,
          )
        .leftJoinAndMapMany(
            'est.userbookinglists',
            tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
            'userbookinglists',
            `userbookinglists.slot_selected = est.id and userbookinglists.status = 1`,
          )
            .where(condition)
            .select(['est','slot.id','slot.ev_events_id','slot.organization_id','userbookinglists'])
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaEventSlotsTimingsRepository.create(data);
        return await this.writeReplicaEventSlotsTimingsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaEventSlotsTimingsRepository.metadata);
        return await this.writeReplicaEventSlotsTimingsRepository.createQueryBuilder('est')
            .update(EventSlotsTimingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaEventSlotsTimingsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null, fields: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = await this.readReplicaEventSlotsTimingsRepository.createQueryBuilder('est')
            .where(condition);
        if(fields && fields.length){
            query = query.select(fields);
        }
        return query
        .orderBy(`est.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, fields: any = ['est'], groupBy : any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = await this.readReplicaEventSlotsTimingsRepository.createQueryBuilder('est')
        .leftJoinAndMapOne(
            'est.slot',
            tableConstant.EVENTS.TBL_EV_SLOTS,
            'slot',
            `slot.id = est.ev_slots_id`,
          );
        query = query.where(condition)
        .select(fields)
        .orderBy(`est.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        if(groupBy){
            query.groupBy(groupBy);
        }
        return await query.getMany();
    }
    async categoryListRecord(condition: any, orderBy: any = null, fields: any = ['est'], groupBy : any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let query = this.readReplicaEventSlotsTimingsRepository.createQueryBuilder('est')
        .leftJoinAndMapOne(
            'est.slot',
            tableConstant.EVENTS.TBL_EV_SLOTS,
            'slot',
            `slot.id = est.ev_slots_id`,
          )
          .where(condition)
        .select(fields)
        .orderBy(`est.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .groupBy(groupBy)
        return query.getRawMany();
    }
    async coachEventListing(condition: any, orderBy: any = null, fields: any = ['est'], groupBy : any = null, joinCond : any = null, paginate = false, paginationParam: PaginateWithCoachesInput = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        let joinCondition = 'user.id = userbookinglists.ev_user_id'
        if(joinCond){
            joinCondition += joinCond;
        }
        let query = await this.readReplicaEventSlotsTimingsRepository.createQueryBuilder('est')
            .innerJoinAndMapOne(
                'est.userbookinglists',
                tableConstant.EVENTS.TBL_EV_USER_BOOKING_LISTS,
                'userbookinglists',
                `est.id = userbookinglists.slot_selected`,
            )
            .innerJoinAndMapOne(
                'est.user',
                tableConstant.TBL_USERS,
                'user',
                joinCondition
            );
        query = query.where(condition)
        .select(fields);
        if(groupBy){
            query = query.groupBy(groupBy);
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
                    ? `est.${paginationParam.order_by}`
                    : 'est.id';
            let resultData = await query
                .where(condition)
                .select(fields)
                .orderBy(orderBy, <any>order)
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .getManyAndCount();
            const [result, total] = resultData;
            return this.commonArrayService.paginationResponse(result, total, paginateObj);
        }
        else{
            return await query.orderBy(`est.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]).getMany();
        }
    }
    async find(condition: any, fields: any, orderBy: any = null) {        
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaEventSlotsTimingsRepository.createQueryBuilder('est')
            .where(condition)
            .select(fields)
            .orderBy(`est.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .groupBy('est.ev_slots_id')
            .getMany();        
    }
    async processAndSaveSlotTimings(slotTimingsData: any[], eventId: number, slotId: number) {
        try{
            // Step 1: Get existing slot conditions
            const existingSlotConditions = await this.readReplicaEventSlotsTimingsRepository
                .createQueryBuilder('slot')
                .select(['slot.id As id', 'CONCAT(slot.slotdate, "-", slot.slotstarttime, "-", slot.slotendtime) AS slotdatamix'])
                .where('slot.ev_events_id = :eventId', { eventId })
                .andWhere('slot.ev_slots_id = :slotId', { slotId })
                .andWhere('slot.status IN (:...status)', { status: [0, 1] })
                .getRawMany();
            // Step 2: Process the existing slot conditions
            const existingSlotMap = existingSlotConditions.reduce((acc, slot) => {
                acc[slot.slotdatamix] = slot.id;
                return acc;
            }, {});
            const slotTimingsDataMap = slotTimingsData.reduce((acc, timing) => {
                const slotDataMix = `${timing.slotdate}-${timing.slotstarttime}-${timing.slotendtime}`;
                acc[slotDataMix] = timing;
                return acc;
            }, {});
            const existingSlotDataMixes = Object.keys(existingSlotMap);
            const slotTimingsDataMixes = Object.keys(slotTimingsDataMap);
            // Step 3: Find matches and non-matches
            const slotTimingsDataMatch = slotTimingsDataMixes.filter(slotDataMix => existingSlotDataMixes.includes(slotDataMix));
            const slotTimingsDataNotMatch = slotTimingsDataMixes.filter(slotDataMix => !existingSlotDataMixes.includes(slotDataMix));
            // Step 4: Update the slots that do not match
            const idsToUpdateInactive = slotTimingsDataNotMatch.map(slotDataMix => existingSlotMap[slotDataMix]).filter(id => id !== undefined);
            if (idsToUpdateInactive.length > 0) {
                await this.writeReplicaEventSlotsTimingsRepository.update(idsToUpdateInactive, { status: 0 });
            }
            // Step 5: Update the slots that match
            const idsToUpdateActive = slotTimingsDataMatch.map(slotDataMix => existingSlotMap[slotDataMix]).filter(id => id !== undefined);
            if (idsToUpdateActive.length > 0) {
                await this.writeReplicaEventSlotsTimingsRepository.update(idsToUpdateActive, { status: 1 });
            }
            // Step 6: Add new slots that are not in the existing data
            const newSlotTimings = slotTimingsDataNotMatch.map(slotDataMix => slotTimingsDataMap[slotDataMix]);
            const slotsToSave = newSlotTimings.map(timing => ({
                ev_slots_id: slotId,
                ev_events_id: eventId,
                slotdate: timing.slotdate,
                slotstarttime: timing.slotstarttime,
                slotendtime: timing.slotendtime,
                slotinterval: timing.slotinterval,
                status: 1,
                created_by: 1, // Replace this with the appropriate user ID
            }));
            if (slotsToSave.length > 0) {
                await this.writeReplicaEventSlotsTimingsRepository.save(slotsToSave);
            }
        }catch (error) {
            throw new Error(error.message); 
        }
    }
}
