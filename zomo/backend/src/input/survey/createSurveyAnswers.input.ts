import { Allow } from 'class-validator';
export class CreateSurveyAnswersInput {
    @Allow() id: number;
    @Allow() q_id: number;
    @Allow() title : string;
    @Allow() correct_ans: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
