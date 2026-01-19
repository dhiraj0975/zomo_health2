import { Allow } from 'class-validator';
export class CreateInsurancePlanInput {
    @Allow() organization_id: number;
    @Allow() plan_name: string;
    @Allow() yearly_plan_saving: string;
    @Allow() extra_spouse_saving: string;
    @Allow() status: number;
}
