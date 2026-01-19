import { Transform, Type, Expose } from 'class-transformer';
export class MyPlanAssignUserPlanDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() plan_id: string;
    @Expose() plan_detail: string;
    @Expose() gc_plan_id: string;
    @Expose() gc_plan_remove: string;
    @Expose() status: number;
    @Expose() created: string;
    @Expose() updated: string;
}
