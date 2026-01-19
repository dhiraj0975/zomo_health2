import { Allow } from 'class-validator';
export class UpdateAssignPlanInput {
    @Allow() data: string;
    @Allow() id: number;
    @Allow() plan_id: string;
    @Allow() org_id: number;
    @Allow() activity_id: number;
    @Allow() status: number;
    @Allow() based_on: number;
    @Allow() display_block: number;
    @Allow() startdate: string;
    @Allow() enddate: string;
    @Allow() completion_base: number;
    @Allow() display_plan_to: number;
    @Allow() display_plan_to_health_source: number;
    @Allow() display_plan_to_health: number;
    @Allow() c_range: number;
    @Allow() completion_on: number;
    @Allow() f_range: number;
    @Allow() frequency_base: number;
    @Allow() is_cron: number;
    @Allow() join_based_on: number;
    @Allow() name: string;
    @Allow() plan_step: number;
    @Allow() created_by: number;
}
