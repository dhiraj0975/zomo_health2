import { Allow } from 'class-validator';
export class CreateWeeksStepsInput {
    @Allow() id: number;
    @Allow() week_no: number;
    @Allow() week_steps: number;
    @Allow() days_week: number;
    @Allow() challenge_id: number;
    @Allow() schedule_id: number;
    @Allow() move_more_goal: number;
    @Allow() move_more_goal_type: number;
    @Allow() f_suggestion: number;
    @Allow() start_date: string;
    @Allow() end_date: string;
    @Allow() status: number;
}
