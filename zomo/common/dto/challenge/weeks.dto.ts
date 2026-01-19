import { Expose, Transform, Type } from 'class-transformer';
import { ChallengeActivityDto } from './challengeactivity.dto';
import { DaysDto } from './days.dto';
const S3_URL =  process.env.S3_URL_PROD;
export class WeeksDto {
    @Expose() id: number;
    @Expose() challenge_id: number;
    @Expose() activity_id: number;
    @Expose() site_activity_desc: string;
    @Expose() manual_activity: string;
    @Expose() manual_desc: string;
    @Expose() completion_status: number = 1;
    @Expose() log_status: number = 0;
    @Expose() meal: string;
    @Expose() amount: number;
    @Expose() quantity: number;
    @Expose() steps: string;
    @Expose() duration: string;
    @Expose() distance: string;
    @Expose() calories: string;
    @Expose() tabacco_status: string;
    @Expose() avalue: number;
    @Expose() waterlogunit: string;
    @Expose() m_numeric: string;
    @Expose() m_short: string;
    @Expose() m_long: string;
    @Expose() m_yesno: string;
    @Expose() m_check: string;
    @Expose() m_field: string;
    @Expose() status: number = 1;
    @Expose() tabmanual: string;
    @Expose() added_date: string;
    @Expose() update_date: string;
    @Expose()
    activity: ChallengeActivityDto;
    @Expose()
    days: DaysDto;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('chweekl_') ? S3_URL + value : value && value.includes('week') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    logofile: string;
}
