import { Expose, Transform, Type } from 'class-transformer';
import { GroupsDto } from './groups.dto';
import { ScheduleChallengeJoinUsersDto } from './schedulechallengejoinusers.dto';
import { TeamMembersDto } from './teammembers.dto';
const S3_URL =  process.env.S3_URL_PROD;
export class TeamsDto {
    @Expose() id: number;
    @Expose() group_id: number;
    @Expose() schedule_id: number;
    @Expose() tname: string;
    @Expose() org_id: number;
    @Expose() team_size: number;
    @Expose() dept_id: number = 0;
    @Expose() loc_id: number = 0;
    @Expose() dept_with_loc_id: number = 0;
    @Expose() created_by: number;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => GroupsDto)
    challengeGroups: GroupsDto;
    @Expose()
    @Type(() => TeamMembersDto)
    teamMember: TeamMembersDto;
    @Expose()
    @Type(() => ScheduleChallengeJoinUsersDto)
    scheduleJoin: ScheduleChallengeJoinUsersDto;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('scchateaml_') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    icon: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('scchateaml_') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    logo: string;
}
