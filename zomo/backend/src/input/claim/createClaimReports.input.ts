import { Allow } from 'class-validator';
export class CreateClaimReportsInput {
    @Allow() id: number;
    @Allow() user_id: string;
    @Allow() org_id: string;
    @Allow() first_name: string;
    @Allow() last_name: string;
    @Allow() uss_number: string;
    @Allow() email: string;
    @Allow() gender: string;
    @Allow() employee_id: string;
    @Allow() claim_number: string;
    @Allow() cost_of_service: number;
    @Allow() icd_code: string;
    @Allow() provider_type: string;
    @Allow() ph_icd_code: string;
    @Allow() ndc_number: number;
    @Allow() label_name: string;
    @Allow() therapeutic_class: string;
    @Allow() birth_date: string;
    @Allow() date_of_service: string;
    @Allow() status: number;
}
