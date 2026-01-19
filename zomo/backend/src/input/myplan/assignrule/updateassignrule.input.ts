import { Allow } from 'class-validator';
export class UpdateAssignRuleInput {
    @Allow() id: number;
    @Allow() plan_id: number;
    @Allow() rule_id: number;
    @Allow() org_id: number;
    @Allow() optional: number;
    @Allow() bstart_date: number;
    @Allow() bend_date: number;
    @Allow() recommended_base: number;
    @Allow() status: number;
}
