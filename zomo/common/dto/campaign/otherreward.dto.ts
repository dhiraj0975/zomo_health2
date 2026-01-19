import { Expose, Transform, Type } from 'class-transformer';
export class OtherRewardDto {
    @Expose() id: number;
    @Expose() reward_id: number;
    @Expose() cust_name: string;
    @Expose() order_id: number;
    @Expose() point: string;
    @Expose() max_point_limit: number;
    @Expose() consider_require: number;
    @Expose() status: number;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
}
