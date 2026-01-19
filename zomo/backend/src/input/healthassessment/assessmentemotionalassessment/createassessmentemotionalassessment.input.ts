import { Allow } from 'class-validator';
export class CreateAssessmentEmotionalAssessmentInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() hra_status: number;
    @Allow() status: number;
    @Allow() eha_reset: number;
}
