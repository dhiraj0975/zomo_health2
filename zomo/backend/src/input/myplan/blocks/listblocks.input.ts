import { Allow } from 'class-validator';
export class ListBlocksInput {
    @Allow() id: number;
    @Allow() plan_id: number;
    @Allow() order: string;
    @Allow() order_by: string;
}
