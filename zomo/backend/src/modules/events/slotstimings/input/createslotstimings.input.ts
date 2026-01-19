import { Allow } from 'class-validator';
export class CreateSlotsTimingsInput {
    @Allow() ev_events_id: number;
    @Allow() organization_id: number;
    @Allow() ev_slots_id: number;
    @Allow() slotdate: string;
    @Allow() slotstarttime: string;
    @Allow() slotendtime: string;
    @Allow() slotinterval: string;
    @Allow() total_booked: number;
    @Allow() created_by: number;
    @Allow() status: number;
}
