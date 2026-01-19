import { Allow } from 'class-validator';
export class ListGlobalEventsInput {
    @Allow() organization_id: number;
    @Allow() event_id?: number;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() search_str: string;
}
