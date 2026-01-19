import { Allow } from 'class-validator';
export class CreateSquaresInput {
    @Allow() card_id: number;
    @Allow() schedule_id: number;
    @Allow() org_id: number;
    @Allow() name: string;
    @Allow() logo: string;
    @Allow() description: string;
    @Allow() parent_id: number;
    @Allow() order_no: number;
    @Allow() link_type: number;
    @Allow() link_id: number;
    @Allow() link: string;
    @Allow() status: number;
}
