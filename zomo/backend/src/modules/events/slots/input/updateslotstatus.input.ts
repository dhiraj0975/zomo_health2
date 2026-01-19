import { Allow } from 'class-validator';
export class UpdateSlotStatusInput {
    @Allow() id: number;
    @Allow() ev_events_id: number;
    @Allow() organization_id: number;
    @Allow() status: number;
}
