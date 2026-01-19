import { Expose, Transform, Type } from 'class-transformer';
import { SquaresDto } from './squares.dto';
import { UserDto } from '../user';
export class SquareUsersDto {
    @Expose() id: number;
    @Expose() schedule_id: number;
    @Expose() card_id: number;
    @Expose() square_id: number;
    @Expose() user_id: number;
    @Expose() verified_userid: number;
    @Expose() verified_status: number;
    @Expose() status: number;
    @Expose() created_date: string;
    @Expose() modified_date: string;
    @Expose()
    @Type(() => SquaresDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                org_id: value.org_id,
                name: value.name,
            };
        }
        else {
            return null
        }
    })
    square: SquaresDto;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
                profile_image: value.profile_image,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
