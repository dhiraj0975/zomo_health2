import { Allow } from 'class-validator';
export class ActivePluginsInput {
    @Allow() company_id: number;
    @Allow() plugin_name: string[];
    @Allow() membership_plan_id: number;
}
