import {Expose, Transform, Type} from 'class-transformer';
import { UserDto } from '../user';
export class DentistsDto {
    @Expose()
    id: number;
    @Expose()
    userid: number;
    @Expose()
    activity_id: number;
    @Expose()
    physician_id: number;
    @Expose()
    date_completed: string;
    @Expose()
    signature: string;
    @Expose()
    is_signed: number;
    @Expose()
    enter_by: number;
    @Expose()
    status: number;
    @Expose()
    inserted: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value?.id,
                code: value?.code,
                first_name: value?.first_name,
                last_name: value?.last_name,
                full_name: value.full_name ?? value?.first_name + ' ' + value?.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}