import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
export class AssignEngagementManagerDto {
    @Expose() id: number;
    @Expose() company_id: number;
    @Expose() user_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                first_name: value.first_name,
                last_name: value.last_name,
                email: value?.email,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
