import { Allow } from 'class-validator';
export class ListManualUpcomingsInput {
    @Allow() org_id: number;
    @Allow() search_str: string;
    @Allow() order: string;
    @Allow() order_by: string;
}
