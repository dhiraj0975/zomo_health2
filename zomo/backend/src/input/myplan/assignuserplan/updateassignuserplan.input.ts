import { Allow } from 'class-validator';
export class UpdateAssignUserPlanInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() plan_id: string;
    @Allow() plan_detail: string;
    @Allow() gc_plan_id: string;
    @Allow() gc_plan_remove: string;
    @Allow() status: number;
}
