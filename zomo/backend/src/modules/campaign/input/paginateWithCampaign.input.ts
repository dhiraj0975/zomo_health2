import { Allow } from 'class-validator';
export class PaginateWithCampaignInput {
    @Allow() id: number;
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() org_id: number;
    @Allow() company_id: string;
    @Allow() organization_id: string;
    @Allow() campaign_id: number;
    @Allow() reward_id: number;
    @Allow() order_id: number;
    @Allow() user_id: number;
    @Allow() activity_id: number;
    @Allow() user_role: number;
    @Allow() ins_id: number;
    @Allow() hide: number;
    @Allow() filter_by: string;
    @Allow() report_type: string;
    @Allow() request_id: string;
    @Allow() status: string;
    @Allow() pointsleaderboardpopup: number;
    @Allow() search_type: string;
    @Allow() date: string;
}
