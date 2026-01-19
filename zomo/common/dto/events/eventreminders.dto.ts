import {Expose, Transform, Type} from 'class-transformer';
export class EventsRemindersDto {
    @Expose() id: number;
    @Expose() ev_events_id: number;
    @Expose() ev_slots_id: number;
    @Expose() reminder_name: string;
    @Expose() reminder_date: string;
    @Expose() reminder_time: number;
    @Expose() reminder_timezone: number;
    @Expose() reminder_subject: string;
    @Expose() reminder_message: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    modified: string;
}
