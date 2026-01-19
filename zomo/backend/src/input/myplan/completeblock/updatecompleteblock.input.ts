import { Allow } from 'class-validator';
export class UpdateCompleteBlockInput {
    @Allow() id: number;
    @Allow() plan_id: number;
    @Allow() block_id: number;
    @Allow() activity_id: number;
    @Allow() user_id: number;
    @Allow() activity_detail: string;
    @Allow() complete_date: string;
}
