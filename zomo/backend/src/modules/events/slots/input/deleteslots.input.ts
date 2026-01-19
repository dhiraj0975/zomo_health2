import { Allow } from 'class-validator';
export class DeleteSlotsInput {
    @Allow() id: number;
    @Allow() ev_events_id: number;
}
