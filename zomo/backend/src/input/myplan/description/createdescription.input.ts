import { Allow } from 'class-validator';
export class CreateDescriptionInput {
    @Allow() organization_id: number;
    @Allow() module_id: number;
    @Allow() description: string;
    @Allow() created_by: number;
    @Allow() status: number;
}
