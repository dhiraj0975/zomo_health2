import { Expose } from 'class-transformer';
let S3_URL = process.env.NODE_ENV == 'PROD' ? process.env.S3_URL_PROD : process.env.S3_URL_DEV

export class CompanyCEMInfoDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() client_names: string;
    @Expose() client_emails: string;
    @Expose() broker_names: string;
    @Expose() broker_emails: string;
    @Expose() program_description: string;
    @Expose() program_deadline: string;
    @Expose() incentive: string;
    @Expose() spouses: string;
    @Expose() communications: string;
    @Expose() census_notes: string;
    @Expose() wellness_meeting: string;
    @Expose() medical_carrier_tpa: string;
    @Expose() funding_level: string;
    @Expose() wellness_funds: string;
    @Expose() employee_benefits: string;
    @Expose() file_notes: string;
    @Expose() wellness_vendor_notes: string;
    @Expose() wellness_committee: string;
    @Expose() other_notes: string;
    @Expose() ooo_start_date: string;
    @Expose() ooo_end_date: string;
    @Expose() ooo_coverage: string;
    @Expose() ooo_auto_email: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() created: string;
    @Expose() updated: string;
}
