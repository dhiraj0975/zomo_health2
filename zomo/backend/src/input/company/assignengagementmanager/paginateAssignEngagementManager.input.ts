import { Allow } from 'class-validator';
export class PaginateAssignEngagementManagerInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() company_id: number;
    @Allow() user_id: number;
}
