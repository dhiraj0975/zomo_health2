import { Allow } from 'class-validator';
export class CampaignCommonInput {
    @Allow() id: number;
    @Allow() campaign_id: number;
    @Allow() organization_id: number;
    @Allow() getType: string;
    @Allow() copy_type: number;
    @Allow() org_id: number;
    @Allow() type: string;
    @Allow() seleted_id: string;
    @Allow() company_id: number;
}