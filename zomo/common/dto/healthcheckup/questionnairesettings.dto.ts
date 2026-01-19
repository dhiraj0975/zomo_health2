import {Expose, Transform, Type} from 'class-transformer';
export class QuestionnaireSettingsDto {
    @Expose()
    id: number;
    @Expose()
    org_id: number;
    @Expose()
    title: string;
    @Expose()
    header_text: string;
    @Expose()
    eligibility: number;
    @Expose()
    display: number;
    @Expose()
    is_logo: number;
    @Expose()
    status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}