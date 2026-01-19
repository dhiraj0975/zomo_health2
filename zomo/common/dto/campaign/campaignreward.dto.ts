import { Expose, Transform, Type } from 'class-transformer';
import { InsuranceRewardDto } from './insurancereward.dto';
import { CashRewardDto } from './cashreward.dto';
import { OtherRewardDto } from './otherreward.dto';
export class CampaignRewardDto {
    @Expose() id: number;
    @Expose() campaign_id: number;
    @Expose() order_id: number;
    @Expose() reward_name: string;
    @Expose() reward_desc: string;
    @Expose() ins_reward: number;
    @Expose() ins_ids: string;
    @Expose() cash_reward: number;
    @Expose() cash_ids: string;
    @Expose() other_reward: number;
    @Expose() other_ids: string;
    @Expose() related_activity: string;
    @Expose() related_challenge: string;
    @Expose() related_category: string;
    @Expose() cat_activity_visibility: number;
    @Expose() hire_date: number;
    @Expose() user_eligible: number;
    @Expose() is_display_status: number;
    @Expose() eligibility: number;
    @Expose() status: number;
    @Expose() org_tab_setting: string;
    @Expose()
    @Type(() => InsuranceRewardDto)
    insurance: InsuranceRewardDto[];
    @Expose()
    @Type(() => CashRewardDto)
    cash: CashRewardDto[];
    @Expose()
    @Type(() => OtherRewardDto)
    other: OtherRewardDto[];
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
}
