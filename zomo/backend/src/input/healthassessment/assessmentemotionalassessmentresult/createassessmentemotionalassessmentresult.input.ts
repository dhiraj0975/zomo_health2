import { Allow } from 'class-validator';
export class CreateAssessmentEmotionalAssessmentResultInput {
    @Allow() id: number;
    @Allow() assessment_id: number;
    @Allow() tab_id: number;
    @Allow() questions_score: number;
    @Allow() status: number;
}
