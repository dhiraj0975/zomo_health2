import { Allow } from 'class-validator';
export class PaginationSubmitFormInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() role_id: number;
    @Allow() user_id: number;
    @Allow() org_id: number;
    @Allow() submitted_date: string;
    @Allow() status: number;
    @Allow() filter_by: string;
    @Allow() filter_date_type: string;
}
