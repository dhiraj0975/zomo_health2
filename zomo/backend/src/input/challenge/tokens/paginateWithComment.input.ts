import { Allow } from 'class-validator';
export class PaginateWithCommentInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() schedule_id: number;
    @Allow() challege_id: number;
    @Allow() team_id: number;
    @Allow() token_number: number;
    @Allow() token_type: string;
    @Allow() to_user_id: number;
    @Allow() submission_date: string;
    @Allow() comment: string;
    @Allow() status: number;
}
