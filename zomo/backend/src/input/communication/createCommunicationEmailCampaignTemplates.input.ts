import { Allow } from 'class-validator';
export class CreateCommunicationEmailCampaignTemplatesInput {
    @Allow() id: number;
    @Allow() subject: string;
    @Allow() template_content: string;
    @Allow() role_id: number;
    @Allow() temp_type: number;
    @Allow() org_id: number;
    @Allow() go_type: number;
    @Allow() created_name: string;
    @Allow() org_name: string;
    @Allow() details_type: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
