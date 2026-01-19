import { Allow } from 'class-validator';
export class PaginateAutoReportInput {
    @Allow() org_id?: number;
    @Allow() report?: number;
    @Allow() frequency?: number;
    @Allow() status?: number;
    @Allow() limit?: number;
    @Allow() page?: number;
    @Allow() order_by?: string;
    @Allow() order?: 'ASC' | 'DESC';
}
