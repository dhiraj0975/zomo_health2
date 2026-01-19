import {Expose, Transform, Type} from 'class-transformer';
export class TobaccoUsesDto {
    @Expose()
    id: number;
    @Expose()
    user_id: number;
    @Expose()
    activity_id: number;
    @Expose()
    is_tobacco_user: number;
    @Expose()
    signature: string;
    @Expose()
    type_of_form: string;
    @Expose()
    date_completed: string;
    @Expose()
    generated_by: number;
    @Expose()
    status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}