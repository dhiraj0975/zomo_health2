import { Allow } from 'class-validator';
export class CreateInsuranceRewardInput {
    @Allow() ins_id: number;
    @Allow() reward_id: number;
    @Allow() cust_name: string;
    @Allow() order_id: number;
    @Allow() point_user: string;
    @Allow() point_spouse: string;
    @Allow() amt_user: string;
    @Allow() amt_spouse: string;
    @Allow() max_point_limit: number;
    @Allow() consider_require: number;
    @Allow() status: number;
}
