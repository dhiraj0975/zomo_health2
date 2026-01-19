import { Allow } from 'class-validator';
export class PaginationActivityInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() role_id: number;
    @Allow() accebility: number;
    @Allow() accebility_status: number;
    @Allow() enable_activity_tracker: number;
    @Allow() enable_reimbursement: number;
    @Allow() category_id: number;
    @Allow() filter_by: string;
    @Allow() visibility: number;
    @Allow() flag: number;
    @Allow() org_id: number;
}
