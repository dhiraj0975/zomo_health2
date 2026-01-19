import { Allow } from 'class-validator';
export class CreateFilesInput {
    @Allow() id: number;
    @Allow() title: string;
    @Allow() description: string;
    @Allow() file_name: string;
    @Allow() organization_id?: string;
    @Allow() is_global: number;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() modified_by: number;
}
