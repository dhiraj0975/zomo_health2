import {Expose, Transform, Type} from 'class-transformer';
export class AuthorizationsDto {
    @Expose()
    id: number;
    @Expose()
    user_id: number;
    @Expose()
    signature: string;
    @Expose()
    type_of_form: string;
    @Expose()
    date_completed: string;
    @Expose()
    activity_id: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
