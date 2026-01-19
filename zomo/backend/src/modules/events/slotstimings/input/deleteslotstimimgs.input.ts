import { Allow } from 'class-validator';
export class DeleteSlotsTimingsInput {
    @Allow() id: number;
    @Allow() ev_events_id: number;
}
