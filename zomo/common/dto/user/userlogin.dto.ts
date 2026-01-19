import { Transform, Type, Expose } from 'class-transformer';
import { UserDto } from './user.dto';
export class UserLoginDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() ip: string;
    @Expose() city: string;
    @Expose() region: string;
    @Expose() country: string;
    @Expose() zipcode: string;
    @Expose() latitude: string;
    @Expose() longitude: string;
    @Expose() timezone: string;
    @Expose() useragent: string;
    @Expose() login_time: string;
    @Expose() logout_time: string;
    @Expose() source: number;
    @Expose() login_source: number;
    @Expose() status: number;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
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
