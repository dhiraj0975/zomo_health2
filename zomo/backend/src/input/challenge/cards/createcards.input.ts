import { Allow } from 'class-validator';
export class CreateCardsInput {
    @Allow() schedule_id: number;
    @Allow() org_id: number;
    @Allow() name: string;
    @Allow() description: string;
    @Allow() parent_id: number;
    @Allow() order_no: number;
    @Allow() status: number;
    @Allow() id: string;
}
