import { Allow } from 'class-validator';
export class PaginateWithCompanyWellnessAssignmentInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() location: number;
    @Allow() department: number;
    @Allow() location_id: string;
    @Allow() department_id: string;
    @Allow() type: string;
    @Allow() state: string;
    @Allow() city: string;
    @Allow() company_id: number;
    @Allow() filter_by: string;
}
