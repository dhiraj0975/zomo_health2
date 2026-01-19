import { Allow } from 'class-validator';
export class UpdateUserBookingListsInput {
    @Allow() id: number;
    @Allow() organization_id: number;
    @Allow() ev_events_id: number;
    @Allow() ev_slots_id: number;
    @Allow() ev_user_id: number;
    @Allow() ev_extension: string;
    @Allow() ev_contact: string;
    @Allow() registration_date: string;
    @Allow() ev_attend_status: number;
    @Allow() status: number;
    @Allow() slot_selected: number;
    @Allow() activity_id: number;
    @Allow() reminder_limit: number;
    @Allow() attend_date: string;
    @Allow() attend_by: number;
}
