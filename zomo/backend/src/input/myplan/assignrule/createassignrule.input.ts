import { Allow } from 'class-validator';
export class CreateAssignRuleInput {
    @Allow() plan_id: number;
    @Allow() rule_id: number;
    @Allow() org_id: number;
    @Allow() optional: number;
    @Allow() bstart_date: string;
    @Allow() bend_date: string;
    @Allow() recommended_base: number;
    @Allow() status: number;
    @Allow() activity_id: number;
    @Allow() model_id: number;
}
