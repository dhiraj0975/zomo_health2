import { Allow } from 'class-validator';
export class CreateAssessmentSettingsInput {
    @Allow() id: number;
    @Allow() organization_id: number;
    @Allow() banner_title: string;
    @Allow() banner_description: string;
    @Allow() banner_image: string;
    @Allow() result_top_decscription: string;
    @Allow() result_bottom_decscription: string;
    @Allow() copied_organization: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
