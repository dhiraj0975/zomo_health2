import { Transform, Type, Expose } from 'class-transformer';
import { UserDto } from '../user';
export class RegionDto {
    @Expose() id: number;
    @Expose() region_name: string;
    @Expose() regional_admin: number;
    @Expose() created_by: number;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value?.id,
                first_name: value?.first_name,
                last_name: value?.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
