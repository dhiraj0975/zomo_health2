import {Expose, Transform, Type} from 'class-transformer';
export class InsuranceRewardDto {
    @Expose() id: number;
    @Expose() ins_id: number;
    @Expose() reward_id: number;
    @Expose() cust_name: string;
    @Expose() order_id: number;
    @Expose() point_user: string;
    @Expose() point_spouse: string;
    @Expose() amt_user: string;
    @Expose() amt_spouse: string;
    @Expose() max_point_limit: number;
    @Expose() consider_require: number;
    @Expose() status: number;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
}
