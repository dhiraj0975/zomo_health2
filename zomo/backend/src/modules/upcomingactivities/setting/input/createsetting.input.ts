import { Allow } from 'class-validator';
export class CreateSettingInput {
    @Allow() org_id: number;
    @Allow() events: number;
    @Allow() challenges: number;
    @Allow() manual_entry: number;
    @Allow() incentive: number;
    @Allow() future_plan: number;
    @Allow() timeline: number;
    @Allow() status: number;
}
