import { Transform, Type, Expose } from 'class-transformer';
export class ClaimReportDto {
    @Expose() id: number;
    @Expose() user_id: string;
    @Expose() org_id: string;
    @Expose() first_name: string;
    @Expose() last_name: string;
    @Expose() uss_number: string;
    @Expose() email: string;
    @Expose() gender: string;
    @Expose() employee_id: string;
    @Expose() claim_number: string;
    @Expose() cost_of_service: number;
    @Expose() icd_code: string;
    @Expose() provider_type: string;
    @Expose() ph_icd_code: string;
    @Expose() ndc_number: number;
    @Expose() label_name: string;
    @Expose() therapeutic_class: string;
    @Expose() status: number;
    @Expose()
    birth_date: string;
    @Expose()
    date_of_service: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
