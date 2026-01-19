import { Transform, Type, Expose } from 'class-transformer';
export class MyPlanJoinUserPlanDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() plan_id: number;
    @Expose() activity_id: number;
    @Expose() is_complete: number;
    @Expose() complete_date: string;
    @Expose() status: number;
    @Expose() progress: number;
    @Expose() created: string;
    @Expose() updated: string;
}
