import { Allow } from 'class-validator';
export class CampaignChallengeListInput {
    @Allow() org_id: number;
    @Allow() campaign_id: number;
    @Allow() search_str: string;
}