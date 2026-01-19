import { Allow } from 'class-validator';
export class AddEventCategoryInput {
    @Allow() c_companies_id: number;
    @Allow() category_name: string;
    @Allow() order_no: number;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
}
