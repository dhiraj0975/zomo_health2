import { Transform, Type, Expose } from 'class-transformer';
export class AssessmentEmotionalAssessmentResultDto {
    @Expose() id: number;
    @Expose() assessment_id: number;
    @Expose() tab_id: number;
    @Expose() questions_score: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
