import { Expose } from 'class-transformer';
export class MyPlanCompleteBlockDto {
    @Expose() id: number;
    @Expose() plan_id: number;
    @Expose() block_id: number;
    @Expose() activity_id: number;
    @Expose() user_id: number;
    @Expose() activity_detail: string;
    @Expose() status: number;
    @Expose() complete_date: string;
    @Expose() created: string;
    @Expose() updated: string;
}
