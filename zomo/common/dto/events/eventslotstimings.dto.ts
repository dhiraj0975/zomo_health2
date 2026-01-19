import { Expose, Transform, Type } from 'class-transformer';
import * as moment from 'moment-timezone';
import { EventSlotsDto } from './eventslots.dto';
export class EventSlotsTimingsDto {
    @Expose() id: number;
    @Expose() ev_events_id: number;
    @Expose() ev_slots_id: number;
    @Expose() slotinterval: string;
    @Expose() total_booked: number;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose()
    created: string;
    @Expose()
    modified: string;
    @Expose()
    slotdate: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj) {
            if (obj.slotstarttime) {
                if(obj.slotstarttime.includes("AM") || obj.slotstarttime.includes("PM")){
                    return obj.slotstarttime;
                }
                const [hours, minutes] = obj.slotstarttime.split(':');
                let period = hours >= 12 ? 'PM' : 'AM';
                let hour = hours % 12 || 12;
                let time = `${hour}:${minutes} ${period}`;
                return time;
            } else {
                return null;
            }
        }
    })
    slotstarttime: number;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj) {
            if (obj.slotendtime) {
                if(obj.slotendtime.includes("AM") || obj.slotendtime.includes("PM")){
                    return obj.slotendtime;
                }
                const [hours, minutes] = obj.slotendtime.split(':');
                let period = hours >= 12 ? 'PM' : 'AM';
                let hour = hours % 12 || 12;
                let time = `${hour}:${minutes} ${period}`;
                return time;
            } else {
                return null;
            }
        }
    })
    slotendtime: number;
    @Expose()
    @Type(() => EventSlotsDto)
    @Transform(({ value }) => (value ? value : null), {
        toClassOnly: true,
    })
    slot: EventSlotsDto;
}
