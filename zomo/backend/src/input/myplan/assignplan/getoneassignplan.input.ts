import { Allow } from 'class-validator';
export class GetOneAssignPlanInput {
    @Allow() id: number;
    @Allow() plan_id: number;
    @Allow() org_id: number;
}
