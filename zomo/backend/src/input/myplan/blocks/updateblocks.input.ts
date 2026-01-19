import { Allow } from 'class-validator';
export class UpdateBlocksInput {
    @Allow() id: number;
    @Allow() name: string;
    @Allow() icon: string;
    @Allow() description: string;
    @Allow() plan_id: number;
    @Allow() order_id: number;
    @Allow() status: number;
}
