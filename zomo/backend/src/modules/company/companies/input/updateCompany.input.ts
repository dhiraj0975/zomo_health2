import { Allow } from 'class-validator';
export class UpdateCompanyInput {
    @Allow() id: number;
    @Allow() companytype_id: number;
    @Allow() company_name: string;
    @Allow() company_logo: string;
    @Allow() company_logo_dark: string;
    @Allow() phone: string;
    @Allow() street_address: string;
    @Allow() state: string;
    @Allow() city: string;
    @Allow() zip: string;
    @Allow() country: string;
    @Allow() deleted: number;
    @Allow() data_limit: number;
    @Allow() is_testing: number;
    @Allow() status: number;
    @Allow() membership_plan_id: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() block_email: number;
}
