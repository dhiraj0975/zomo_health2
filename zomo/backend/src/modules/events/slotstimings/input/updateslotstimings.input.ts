import { Allow } from 'class-validator';
export class UpdateSlotsTimingsInput {
    @Allow() id: number;
    @Allow() ev_events_id: number;
    @Allow() ev_slots_id: number;
    @Allow() slotdate: number;
    @Allow() slotstarttime: number;
    @Allow() slotendtime: number;
    @Allow() slotinterval: string;
    @Allow() total_booked: number;
    @Allow() created_by: number;
    @Allow() status: number;
}
