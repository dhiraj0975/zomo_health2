import {Expose, Transform, Type} from 'class-transformer';
export class SurveyUserAnswersDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() popup_id: number;
    @Expose() user_id: number;
    @Expose() question_answers : string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
