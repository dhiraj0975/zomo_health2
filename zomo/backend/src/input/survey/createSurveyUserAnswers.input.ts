import { Allow } from 'class-validator';
export class CreateSurveyUserAnswersInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() popup_id: number;
    @Allow() user_id: number;
    @Allow() question_answers : string;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
