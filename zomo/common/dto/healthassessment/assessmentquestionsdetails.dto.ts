import { Transform, Type, Expose } from 'class-transformer';
export class AssessmentQuestionsDetailsDto {
    @Expose() id: number;
    @Expose() question_id: number;
    @Expose() language_id: number;
    @Expose() question_title: string;
    @Expose() main_question_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
