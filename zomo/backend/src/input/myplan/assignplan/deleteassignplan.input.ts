import { Allow } from 'class-validator';
export class DeleteAssignPlanInput {
    @Allow() id: number;
    @Allow() plan_id: number;
    @Allow() org_id: number;
}
