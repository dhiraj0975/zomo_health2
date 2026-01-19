import { Allow } from 'class-validator';
export class FrontCampaignInput {
    @Allow() company_id: number;
    @Allow() org_id: number;
    @Allow() call_from: string;
    @Allow() call_for: string;
    @Allow() campaign_id: number | string;
    @Allow() challenge_start_date: string;
    @Allow() challenge_end_date: string;
    @Allow() department_id: number;
    @Allow() location_id: number;
    @Allow() reward_id: number;
    @Allow() user_id: number;
}