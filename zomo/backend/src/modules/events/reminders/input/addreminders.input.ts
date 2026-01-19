import { Allow } from 'class-validator';
export class AddRemindersEventsInput {
    @Allow() ev_events_id: number;
    @Allow() ev_slots_id: number;
    @Allow() reminder_name: string;
    @Allow() reminder_date: number;
    @Allow() reminder_time: number;
    @Allow() reminder_timezone: number;
    @Allow() reminder_subject: string;
    @Allow() reminder_message: string;
    @Allow() status: number;
}
