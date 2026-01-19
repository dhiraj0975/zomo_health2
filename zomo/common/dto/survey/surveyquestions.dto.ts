import {Expose, Transform, Type} from 'class-transformer';
export class SurveyQuestionsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() popup_id: number;
    @Expose() title : string;
    @Expose() ans_option_type: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
