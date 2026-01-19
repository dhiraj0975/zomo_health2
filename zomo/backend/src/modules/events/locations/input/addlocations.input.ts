import { Allow } from 'class-validator';
export class AddLocationsEventsInput {
    @Allow() ev_events_id: number;
    @Allow() organization_id: number;
    @Allow() locations_id: number;
    @Allow() display_timeslot: number;
    @Allow() status: number;
}
