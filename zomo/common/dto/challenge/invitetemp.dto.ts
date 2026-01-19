import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
export class InviteTempDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() org_id: number;
    @Expose() schedule_id: number;
    @Expose() added_by: number;
    @Expose() status: number;
    @Expose() updated: string;
    @Expose() added_date: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
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
