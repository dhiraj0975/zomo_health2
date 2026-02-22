import { Allow } from 'class-validator';
export class ListLocationInput {
    @Allow() type: string;
    @Allow() search_str: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() membership_code: string;
    @Allow() default: string;
    @Allow() country: string;
    @Allow() StateFullName: string;
    @Allow() company_id: number | string;
}
