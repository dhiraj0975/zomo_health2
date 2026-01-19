import { Transform, Type, Expose } from 'class-transformer';
import { UserDto } from '../user';
export class SpouseDto {
    @Expose() id: number;
    @Expose() firstname: string;
    @Expose() lastname: string;
    @Expose() email: string;
    @Expose() relationship_id: string;
    @Expose() activation_key: string;
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
                    code: value.code,
                    first_name: value.first_name,
                    last_name: value.last_name,
                    full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
                    status: value.status,
                };
            }
            else {
                return null
            }
        })
        user: UserDto;
}
