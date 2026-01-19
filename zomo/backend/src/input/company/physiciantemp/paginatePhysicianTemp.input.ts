import { Allow } from 'class-validator';
export class PaginatePhysicianTempInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() user_id: number;
    @Allow() physiciantype_id: number;
}
