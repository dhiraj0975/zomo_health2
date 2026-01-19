import { Allow } from 'class-validator';
export class PaginationSurveyInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() org_id: number;
    @Allow() popup_id: number;
    @Allow() q_id: number;
    @Allow() user_id: number;
    @Allow() status: string;
}
