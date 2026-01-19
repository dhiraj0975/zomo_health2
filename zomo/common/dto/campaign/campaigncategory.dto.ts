import { Expose, Transform, Type } from 'class-transformer';
import { CategoryDto } from '../activity';
export class CampaignCategoryDto {
    @Expose() id: number;
    @Expose() campaign_id: number;
    @Expose() order_id: number;
    @Expose() category_id: number;
    @Expose() reward_id: number;
    @Expose() cust_name: string;
    @Expose() cust_description: string;
    @Expose() quentity: string;
    @Expose() required_by_user: string;
    @Expose() required_by_spouse: string;
    @Expose() frequincy: string;
    @Expose() frequincy_max_point: string;
    @Expose() point_for_each: string;
    @Expose() max_point: string;
    @Expose() ac_max: string;
    @Expose() ac_min: string;
    @Expose() per_change: string;
    @Expose() alt_activity: number;
    @Expose() alt_act_point: string;
    @Expose() reward_for: number;
    @Expose() is_hidden_on_activity_page: number;
    @Expose() status: number;
    @Expose() consider_after_deadline: number;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    point_end_date: string;
    @Expose()
    after_deadline_date: string;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => CategoryDto)
    category: CategoryDto[];
}
