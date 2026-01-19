import { Expose } from 'class-transformer';
export class CensusFrequencyDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() recurring_pattern_type: number;
    @Expose() weekly_basis_day: string;
    @Expose() monthly_basis: number;
    @Expose() monthly_date_basis: string;
    @Expose() monthly_basis_Type: number;
    @Expose() monthly_basis_day: string;
    @Expose() year_basis_day: number;
    @Expose() year_basis_month: number;
    @Expose() upload_type: number;
    @Expose() user_notify: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose() created: string;
    @Expose() updated: string;
}
