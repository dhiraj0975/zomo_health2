import {Expose, Transform, Type} from 'class-transformer';
import * as moment from 'moment-timezone';
// import * as moment from 'moment-timezone';
export class EventSlotsDto {
    @Expose() id: number;
    @Expose() ev_events_id: number;
    @Expose() organization_id: number;
    @Expose() slot_timezone: number;
    @Expose() dividing_slot_type: number;
    @Expose() slot_interval: string;
    @Expose() slot_total: number;
    @Expose() attendee_limit_type: number;
    @Expose() attendee_limit: number;
    @Expose() recurring_pattern_type: number;
    @Expose() weekly_basis_day: string;
    @Expose() weekly_basis_day_bio: string;
    @Expose() monthly_basis: number;
    @Expose() monthly_date_basis: number;
    @Expose() monthly_basis_Type: number;
    @Expose() monthly_basis_day: number;
    @Expose() year_basis_day: number;
    @Expose() year_basis_month: number;
    @Expose() slot_visibility_locations: string;
    @Expose() slot_visibility_departments: string;
    @Expose() event_location: string;
    @Expose() event_address: string;
    @Expose() event_city: string;
    @Expose() event_state: string;
    @Expose() event_zipcode: number;
    @Expose() booking_price: number;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() registration_end: number;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    created: string;
    @Expose()
    modified: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj) {
            if (obj.start_time) {
                if(obj.start_time.includes("AM") || obj.start_time.includes("PM")){
                    return obj.start_time;
                }
                const [hours, minutes] = obj.start_time.split(':');
                let period = hours >= 12 ? 'PM' : 'AM';
                let hour = hours % 12 || 12;
                let time = `${hour}:${minutes} ${period}`;
                return time;
            } else {
                return null;
            }
        }
    })
    start_time: number;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj) {
            if (obj.end_time) {
                if(obj.end_time.includes("AM") || obj.end_time.includes("PM")){
                    return obj.end_time;
                }
                const [hours, minutes] = obj.end_time.split(':');
                let period = hours >= 12 ? 'PM' : 'AM';
                let hour = hours % 12 || 12;
                let time = `${hour}:${minutes} ${period}`;
                return time;
            } else {
                return null;
            }
        }
    })
    end_time: number;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj) {
            if (obj.slot_hour) {
                if(obj.slot_hour.includes("AM") || obj.slot_hour.includes("PM")){
                    return obj.slot_hour;
                }
                const [hours, minutes, seconds] = obj.slot_hour.split(':');
                let period = hours >= 12 ? 'PM' : 'AM';
                let hour = hours % 12 || 12;
                let time = `${hour}:${minutes} ${period}`;
                return time;
            } else {
                return null;
            }
        }
    })
    slot_hour: number;
}
