import { Allow } from 'class-validator';
export class ListInput {
    @Allow() search_str: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() type: string;
}
