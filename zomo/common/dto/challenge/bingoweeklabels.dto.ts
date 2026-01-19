import { Expose } from 'class-transformer';
import { ScheduleChallengeDto } from './schedulechallenge.dto';
export class BingoWeekLabelsDto  {
    @Expose() id: number;
    @Expose() schedule_id: number;
    @Expose() week_no: number;
    @Expose() week_custom_name: string;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() created_date: string;
    @Expose() updated_date: string;
    @Expose()
    scheduleChallenge : ScheduleChallengeDto;
}
