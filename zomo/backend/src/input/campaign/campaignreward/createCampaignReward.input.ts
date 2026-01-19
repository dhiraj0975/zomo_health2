import { Allow } from 'class-validator';
export class CreateCampaignRewardInput {
    @Allow() id: number;
    @Allow() organization_id: number;
    @Allow() campaign_id: number;
    @Allow() order_id: number;
    @Allow() reward_name: string;
    @Allow() reward_desc: string;
    @Allow() ins_reward: number;
    @Allow() ins_ids: string;
    @Allow() cash_reward: number;
    @Allow() cash_ids: string;
    @Allow() other_reward: number;
    @Allow() other_ids: string;
    @Allow() related_activity: string;
    @Allow() related_challenge: string;
    @Allow() related_category: string;
    @Allow() cat_activity_visibility: number;
    @Allow() hire_date: number;
    @Allow() user_eligible: number;
    @Allow() is_display_status: number;
    @Allow() eligibility: number;
    @Allow() status: number;
    @Allow() org_tab_setting: string;
}
