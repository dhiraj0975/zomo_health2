import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
import { UserDto } from '../user';
export class IncentiveReportsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() user_role: number;
    @Expose() membership_code: string;
    @Expose() condition: string;
    @Expose() report_type: string;
    @Expose() file_name: string;
    @Expose() total_download: number;
    @Expose() email: string;
    @Expose() is_range: number;
    @Expose() camp_id: string;
    @Expose() engagement_report: number;
    @Expose() request_source: number;
    @Expose() email_status: number;
    @Expose() report_setting_id: number;
    @Expose() auto_report_type: number;
    @Expose() auto_report_zip_password: string;
    @Expose() report_item_status: string;
    @Expose() report_item_type: string;
    @Expose() send_cc_emails: string;
    @Expose() request_timezone: string;
    @Expose() request_timezone_time: string;
    @Expose() error_message: string;
    @Expose() status: number;
    @Expose()
    request_date: string;
    @Expose()
    start_date_range: string;
    @Expose()
    end_date_range: string;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value && value.id) {
            return {
                id: value.id,
                code: value.code,
                company_name: value.company_name,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
