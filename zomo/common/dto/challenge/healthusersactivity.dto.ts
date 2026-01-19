import { Transform, Type, Expose } from 'class-transformer';
import { UserDto } from '../user';
import { HealthActivityDto } from './healthactivity.dto';
export class HealthUsersActivityDto {
    @Expose() id: number;
    @Expose() act_id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() miles: number;
    @Expose()
    act_date: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose() status: number = 1;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                user_name: value.username,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
                profile_image: value.profile_image
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
    @Expose()
    @Type(() => HealthActivityDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                name: value.name,
            };
        }
        else {
            return null
        }
    })
    health_activity: HealthActivityDto;
}
