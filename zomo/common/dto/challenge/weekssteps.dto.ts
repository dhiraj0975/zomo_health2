import { Transform, Type, Expose } from 'class-transformer';
export class WeeksStepsDto {
    @Expose() id: number;
    @Expose() week_no: number;
    @Expose() week_steps: number;
    @Expose() days_week: number;
    @Expose() challenge_id: number;
    @Expose() schedule_id: number;
    @Expose() move_more_goal: number = 0;
    @Expose() move_more_goal_type: number = 0;
    @Expose() f_suggestion: number = 0;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
    @Expose() status: number;
}
