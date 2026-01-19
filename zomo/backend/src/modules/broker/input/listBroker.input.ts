import { Allow } from 'class-validator';
export class ListBrokerInput {
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() region_id: number;
    @Allow() search_str: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() type: string;
    @Allow() filter_by: string;
}
 