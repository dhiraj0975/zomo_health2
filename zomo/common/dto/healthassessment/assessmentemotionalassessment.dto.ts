import { Transform, Type, Expose } from 'class-transformer';
export class AssessmentEmotionalAssessmentDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() hra_status: number;
    @Expose() status: number;
    @Expose() eha_reset: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
