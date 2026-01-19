import { Allow } from 'class-validator';
export class CreateAssessmentQuestionsDetailsInput {
    @Allow() id: number;
    @Allow() question_id: number;
    @Allow() language_id: number;
    @Allow() question_title: string;
    @Allow() main_question_id: number;
    @Allow() status: number;
}
