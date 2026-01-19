import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
import { CampaignActivityDto } from '../campaign';
export class CustomPointDto {
    @Expose() id: number;
    @Expose() user_name: string;
    @Expose() user_id: number;
    @Expose() org_id: number;
    @Expose() activity_id: number;
    @Expose() activity_name: string;
    @Expose() point: string;
    @Expose() status: number;
    @Expose()
    date: string;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Transform(({ obj }) => (obj.user ? obj.user.code : '' ), { toClassOnly: true })
    code: any;
    @Expose()
    @Transform(({ obj }) => (obj.user ? obj.user.username : '' ), { toClassOnly: true })
    username: any;
    @Expose()
    @Transform(({ obj }) => (obj?.campaignactivity?.campaignreward ? obj?.campaignactivity?.campaignreward.reward_name : '' ), { toClassOnly: true })
    reward_name: any;
    @Expose() request_id: number;
    @Expose() added_by: number;
}
