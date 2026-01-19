import { Allow } from 'class-validator';
export class UpdateJoinUserPlanInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() plan_id: number;
    @Allow() activity_id: number;
    @Allow() is_complete: number;
    @Allow() complete_date: string;
    @Allow() status: string;
    @Allow() progress: string;
}
