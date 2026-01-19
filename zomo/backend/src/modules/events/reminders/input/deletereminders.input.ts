import { Allow } from 'class-validator';
export class DeleteRemindersEventsInput {
    @Allow() id: number;
    @Allow() ev_events_id: number;
}
