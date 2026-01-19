import { Transform, Type, Expose } from 'class-transformer';
import { UserDto } from '../user';
import { ScheduleChallengeJoinUsersDto } from './schedulechallengejoinusers.dto';
export class TeamMembersDto {
    @Expose() id: number;
    @Expose() team_id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() user_order: number = 0;
    @Expose() iscaptain: number = 0;
    @Expose() baton_status: number = 0;
    @Expose()
    baton_start: string;
    @Expose()
    created_date: string;
    @Expose()
    updated: string;
    @Expose() status: number = 1;
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
                profile_image: value.profile_image
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
    @Expose()
    @Type(() => ScheduleChallengeJoinUsersDto)
    scheduleJoin: ScheduleChallengeJoinUsersDto;
}
