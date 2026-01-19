import { Allow } from 'class-validator';
export class CreateOtherRewardInput {
    @Allow() id: number;
    @Allow() reward_id: number;
    @Allow() cust_name: string;
    @Allow() order_id: number;
    @Allow() point: string;
    @Allow() max_point_limit: number;
    @Allow() consider_require: number;
    @Allow() status: number;
}
