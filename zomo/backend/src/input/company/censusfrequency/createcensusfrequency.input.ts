import { Allow } from 'class-validator';
export class CreateCensusFrequencyInput {
    @Allow() organization_id: number;
    @Allow() recurring_pattern_type: number;
    @Allow() weekly_basis_day: string;
    @Allow() monthly_basis: number;
    @Allow() monthly_date_basis: string;
    @Allow() monthly_basis_Type: number;
    @Allow() monthly_basis_day: string;
    @Allow() year_basis_day: number;
    @Allow() year_basis_month: number;
    @Allow() upload_type: number;
    @Allow() user_notify: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
