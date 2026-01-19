import { Allow } from 'class-validator';
import { SortDirection } from '@common-constants';
export class PaginateInput {
    @Allow() page?:number;
    @Allow() limit?:number;
    @Allow() order_by?:string;
    @Allow() order?: SortDirection;
    @Allow() search_str?:string;
    @Allow() user_id?:number;
    @Allow() org_id?:number;
    @Allow() newlink?:string;
    @Allow() filter_by?:string;
    @Allow() status?:number;
    @Allow() date?:string;
}
