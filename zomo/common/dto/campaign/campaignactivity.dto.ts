import { Expose, Transform, Type } from 'class-transformer';
import { ActivitiesDto, CategoryDto } from '../activity';
import { CampaignRewardDto } from '../campaign';
export class CampaignActivityDto {
    @Expose() id: number;
    @Expose() campaign_id: number;
    @Expose() order_id: number;
    @Expose() activity_id: number;
    @Expose() reward_id: number;
    @Expose() cust_name: string;
    @Expose() cust_description: string;
    @Expose() opentype: number;
    @Expose() openinternal: number;
    @Expose() openexternal: string;
    @Expose() video: number;
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
    @Expose() steps: string;
    @Expose() min_act_req_camp: number;
    @Expose() source_type: number;
    @Expose() count_type: number;
    @Expose() category_visibility: number;
    @Expose() is_display_status: number;
    @Expose() is_hidden_on_activity_page: number;
    @Expose() status: number;
    @Expose() consider_after_deadline: number;
    @Expose() start_date: string;
    @Expose() end_date: string;
    @Expose() point_end_date: string;
    @Expose() after_deadline_date: string;
    @Expose() added_date: string;
    @Expose() updated_date: string;
    @Expose()
    @Transform(({ obj }) => (obj.activity ? obj.activity.activity_name : null ), { toClassOnly: true })
    activity_name: any;
    @Expose()
    @Type(() => ActivitiesDto)
    activity: ActivitiesDto[];
    @Expose()
    @Type(() => CategoryDto)
    category: CategoryDto[];
    @Expose()
    @Type(() => CampaignRewardDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value?.id,
                reward_name: value?.reward_name,
            };
        }
    })
    campaignreward: CampaignRewardDto;
}
