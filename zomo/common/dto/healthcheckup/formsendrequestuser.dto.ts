import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
export class FormSendRequestUserDto {
    @Expose() id: number;
    @Expose() name: string;
    @Expose() username: string;
    @Expose() email: string;
    @Expose() email_status: number;
    @Expose() file: string;
    @Expose() status: number;
    @Expose() request_id: number;
    @Expose() updated_by: number;
    @Expose() user_id: number;
    @Expose() org_id: number;
    @Expose() response_message: string;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                email: value.email,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
