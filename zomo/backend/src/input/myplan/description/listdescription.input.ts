import { Allow } from 'class-validator';
export class ListDescriptionInput {
    @Allow() id: number;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() created_by: string;
}
