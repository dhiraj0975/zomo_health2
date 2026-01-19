import { Allow } from 'class-validator';
export class CreateassessmentemotionalassessmentanswerInput {
    @Allow() id: number;
    @Allow() assessment_id: number;
    @Allow() result_id: number;
    @Allow() option_id: number;
    @Allow() answer: string;
    @Allow() status: number;
}
