import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';

export class UserNotificationDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() title: string;
    @Expose() message: string;
    @Expose() type: number;
    @Expose() module_name: string;
    @Expose() submodule_name?: string;
    @Expose() is_read: number;
    @Expose() metadata?: Record<string, any>;
    @Expose() status: number;
    @Expose()
    created_at: string;

    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? `${value.first_name} ${value.last_name}`,
                status: value.status,
            };
        } else {
            return null;
        }
    })
    user?: UserDto;
}
