import { Allow } from 'class-validator';
export class PaginateWithDiseaseManagementInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() org_id: number;
    @Allow() company_id: number;
    @Allow() disease_id: number;
    @Allow() form_id: number;
    @Allow() user_id: number;
    @Allow() activity_id: number;
    @Allow() physician_id: number;
    @Allow() weight: number;
    @Allow() type: string;
}
