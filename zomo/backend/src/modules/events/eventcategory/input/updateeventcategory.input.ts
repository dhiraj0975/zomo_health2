import { Allow } from 'class-validator';
export class UpdateEventCategoryInput {
    @Allow() id: number;
    @Allow() category_name: string;
    @Allow() c_companies_id: number;
    @Allow() order_no: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
