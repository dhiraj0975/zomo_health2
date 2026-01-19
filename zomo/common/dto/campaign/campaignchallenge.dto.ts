import { Expose, Transform, Type } from 'class-transformer';
import { ScheduleChallengeDto, ChallengeDto } from '../challenge';
export class CampaignChallengeDto {
    @Expose() id: number;
    @Expose() campaign_id: number;
    @Expose() challenge_id: number;
    @Expose() challenge_schedule_id: number;
    @Expose() reward_id: number;
    @Expose() reward_for: number;
    @Expose() point: string;
    @Expose() order_id: number;
    @Expose() status: number;
    @Expose() consider_after_deadline: number;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    point_end_date: string;
    @Expose()
    after_deadline_date: string;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => ScheduleChallengeDto)
    sc: ScheduleChallengeDto[];
    @Expose()
    @Type(() => ChallengeDto)
    ch: ChallengeDto[];
}
