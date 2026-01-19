import { Allow } from 'class-validator';
export class CreateCategoriesInput {
    @Allow() name: string;
    @Allow() description: string;
    @Allow() modified_by: string;
    @Allow() created_by: string;
    @Allow() status: number;
    @Allow() category_type: string;
}
