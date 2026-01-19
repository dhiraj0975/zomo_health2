import { Allow } from 'class-validator';
export class UpdatePlansInput {
    @Allow() id: number;
    @Allow() name: string;
    @Allow() icon: string;
    @Allow() org_id: number;
    @Allow() description: string;
    @Allow() created_by: number;
    @Allow() status: number;
}
