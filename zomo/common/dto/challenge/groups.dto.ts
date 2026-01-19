import { Expose, Transform, Type } from 'class-transformer';
import { TeamsDto } from './teams.dto';
const S3_URL =  process.env.S3_URL_PROD
export class GroupsDto {
    @Expose() id: number;
    @Expose() schedule_id: number;
    @Expose() org_id: number;
    @Expose() name: string;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('scchagroupl_') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    logo: string;
    @Expose()
    @Type(() => TeamsDto)
    team: TeamsDto;
}
