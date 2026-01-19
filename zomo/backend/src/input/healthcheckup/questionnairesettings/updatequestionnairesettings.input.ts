import { Allow } from 'class-validator';
export class UpdateQuestionnaireSettingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() title: string;
    @Allow() header_text: string;
    @Allow() eligibility: number;
    @Allow() display: number;
    @Allow() is_logo: number;
    @Allow() status: number;
}
