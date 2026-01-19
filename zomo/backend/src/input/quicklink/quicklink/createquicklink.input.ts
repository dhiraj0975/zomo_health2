import { Allow } from 'class-validator';
export class CreateQuickLinkInput {
    @Allow() c_companies_id: string;
    @Allow() folder_id: number;
    @Allow() title: string;
    @Allow() description: string;
    @Allow() link: string;
    @Allow() sort_order: number;
    @Allow() is_video: number;
    @Allow() activity_id: number;
    @Allow() eligibility: number;
    @Allow() modified: string;
    @Allow() status: number;
    @Allow() healthplanname: string;
    @Allow() usernotonhealthplan: number;
    @Allow() dispalybasedon: number;
    @Allow() fromdate: string;
    @Allow() todate: string;
    @Allow() created_by: number;
    @Allow() updated_by: number;
}
