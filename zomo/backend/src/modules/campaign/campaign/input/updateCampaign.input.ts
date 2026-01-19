import { Allow } from 'class-validator';
export class UpdateCampaignInput {
    @Allow() id: number;
    @Allow() organization_id: number;
    @Allow() location_ids: string;
    @Allow() department_ids: string;
    @Allow() campaign_name: string;
    @Allow() tab_titled: string;
    @Allow() tab_order: number;
    @Allow() d_start_date: string;
    @Allow() d_end_date: string;
    @Allow() start_date: string;
    @Allow() end_date: string;
    @Allow() status: number;
    @Allow() is_copy: number;
}
