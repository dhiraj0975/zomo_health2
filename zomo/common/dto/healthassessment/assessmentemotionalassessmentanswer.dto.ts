import { Transform, Type, Expose } from 'class-transformer';
export class AssessmentEmotionalAssessmentAnswerDto {
    @Expose() id: number;
    @Expose() assessment_id: number;
    @Expose() result_id: number;
    @Expose() option_id: number;
    @Expose() answer: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
