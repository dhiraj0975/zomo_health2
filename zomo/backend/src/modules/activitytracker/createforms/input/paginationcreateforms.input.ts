import { Allow } from 'class-validator';
export class PaginationCreateFormsInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() role_id: number;
    @Allow() org_id: number;
    @Allow() approval_type: string;
    @Allow() status: number;
    @Allow() filter_by: string;
}
