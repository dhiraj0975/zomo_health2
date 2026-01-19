import { Allow } from 'class-validator';
export class CreateSliderSettingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() hide: number;
    @Allow() activity_page_tab: number;
    @Allow() dashboard_tab: number;
    @Allow() status: number;
}
