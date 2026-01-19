import { Allow } from 'class-validator';
export class DeleteLocationsEventsInput {
    @Allow() id: number;
    @Allow() ev_events_id: number;
}
