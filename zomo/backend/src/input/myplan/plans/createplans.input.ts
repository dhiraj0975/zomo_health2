import { Allow } from 'class-validator';
export class CreatePlansInput {
    @Allow() name: string;
    @Allow() icon: string;
    @Allow() description: string;
    @Allow() created_by: number;
    @Allow() status: number;
}
