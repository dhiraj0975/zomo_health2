import { Allow } from 'class-validator';
export class ListLocationsEventsInput {
    @Allow() ev_events_id: number;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() search_str: string;
}
