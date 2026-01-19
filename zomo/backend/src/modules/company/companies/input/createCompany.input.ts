import { Allow } from 'class-validator';
export class CreateCompanyInput {
    @Allow() companytype_id: number;
    @Allow() company_name: string;
    @Allow() company_logo: string;
    @Allow() company_logo_dark: string;
    @Allow() phone: string;
    @Allow() street_address: string;
    @Allow() state: string;
    @Allow() city: string;
    @Allow() zip: string;
    @Allow() code: string;
    @Allow() country: string;
    @Allow() deleted: number;
    @Allow() status: number;
    @Allow() is_testing: number;
    @Allow() membership_plan_id: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() block_email: number;
}
