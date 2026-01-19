import { Allow } from 'class-validator';
export class CreateAssessmentHaOptionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
    @Allow() option_title: string;
    @Allow() algo_value: number;
    @Allow() parent_id: number;
    @Allow() main_option_id: number;
    @Allow() order: number;
    @Allow() type: number;
    @Allow() risk_rating: number;
}
