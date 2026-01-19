import { Allow } from 'class-validator';
export class MembershipPlanInput {
    @Allow() id: number;
    @Allow() name: string;
    @Allow() description: string;
    @Allow() default_plugins: string;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
}
