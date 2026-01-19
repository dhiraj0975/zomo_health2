import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
export class ChatSettingsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() chat_with_dept: number;
    @Expose() chat_with_loc: number;
    @Expose() chat_with_users: number;
    @Expose() chat_with_team: number;
    @Expose() chat_own_team: number;
    @Expose() status: number;
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
                timezone: value.timezone,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
