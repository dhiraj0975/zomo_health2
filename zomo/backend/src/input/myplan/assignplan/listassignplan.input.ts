import { Allow } from 'class-validator';
export class ListAssignPlanInput {
    @Allow() id: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() org_id: number;
    @Allow() plan_id: number;
}
