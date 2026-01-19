import { Allow } from 'class-validator';
export class CreateSurveyQuestionsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() popup_id: number;
    @Allow() title : string;
    @Allow() ans_option_type: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
