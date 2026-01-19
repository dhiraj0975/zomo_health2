import { Allow } from 'class-validator';
export class PaginateRegionStateCityInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() region_id: number;
}
