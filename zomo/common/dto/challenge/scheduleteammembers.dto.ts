import { Expose, Transform, Type } from 'class-transformer';
import { DepartmentsDto, LocationsDto } from '../company';
import { UserDto } from '../user';
import { InviteUserDto } from './inviteuser.dto';
import { ScheduleChallengeJoinUsersDto } from './schedulechallengejoinusers.dto';
export class SCTeamMembersDto {
    @Expose() id: number;
    @Expose() team_id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() user_order: number = 0;
    @Expose() iscaptain: number = 0;
    @Expose() baton_status: number = 0;
    @Expose()
    @Type(() => Number)
    @Transform(({ value }) => (value ? value.toString() : null), {
        toClassOnly: true,
    })
    baton_start: number;
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
    users: UserDto;
    @Expose()
    @Type(() => DepartmentsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                name: value.dept_name,
            };
        }
        else {
            return null
        }
    })
    department: DepartmentsDto;
    @Expose()
    @Type(() => LocationsDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                location_name: value.location_name,
                lname: value.lname,
                city: value.city,
                state: value.state,
            };
        }
        else {
            return null
        }
    })
    location: LocationsDto;
    @Expose()
    @Type(() => ScheduleChallengeJoinUsersDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                trek_level_id: value.trek_level_id,
                in_ranking: value.in_ranking,
                schedule_id: value.schedule_id,
            };
        }
        else {
            return null
        }
    })
    scheduleJoin: ScheduleChallengeJoinUsersDto
    @Expose()
    invitechallengeUsers: InviteUserDto
}
