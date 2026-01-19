import { Allow } from 'class-validator';
export class PaginateInput {
    @Allow() page?:number;
    @Allow() limit?:number;
    @Allow() order_by?:string;
    @Allow() order?:string;
    @Allow() search_str?:string;
    @Allow() user_id?:number;
    @Allow() org_id?:number;
    @Allow() newlink?:string;
    @Allow() filter_by?:string;
    @Allow() status?:number;
}
