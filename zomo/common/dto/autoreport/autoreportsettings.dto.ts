import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
import { appConstant } from '../../constant';
export class AutoreportsettingsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_role: number;
    @Expose() membership_code: string;
    @Expose() module_id: number;
    @Expose() frequency_type: number;
    @Expose() weekly_days: string;
    @Expose() monthly_basis: number;
    @Expose() monthly_date_basis: number;
    @Expose() monthly_basis_type: number;
    @Expose() monthly_basis_day: string;
    @Expose() year_basis_day: number;
    @Expose() year_basis_month: number;
    @Expose() f_module_report_type: string;
    @Expose() f_module_items: string;
    @Expose() f_health_plans: string;
    @Expose() f_engagement_report: number;
    @Expose() f_department: string;
    @Expose() f_location: string;
    @Expose() f_country: string;
    @Expose() f_state: string;
    @Expose() f_city: string;
    @Expose() f_from_date: string;
    @Expose() f_to_date: string;
    @Expose() f_terminated_users: number;
    @Expose() send_emails: string;
    @Expose() email_subject: string;
    @Expose() email_content: string;
    @Expose() status: number;
    @Expose() challenge_status: string;
    @Expose() challenge_type: string;
    @Expose() send_cc_emails: string;
    @Expose() timezone_time: string;
    @Expose() org_timezone: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() created_date: string;
    @Expose() updated_date: string;
    @Expose() report_fields: string;
    @Expose() otheroptions: string;
    @Expose() report_type: string;
    @Expose()
    @Transform(({ obj }) => {
        if (obj.f_module_items && obj.f_module_items != '' && obj.f_module_items != 0) {
            switch (obj.module_id) {
                case 1:
                    return Array.isArray(obj?.campaignName) ? obj.campaignName : [];
                case 14:
                    return Array.isArray(obj?.campaignName) ? obj.campaignName : [];
                case 2:
                    return Array.isArray(obj?.plansName) ? obj.plansName : [];
                case 3:
                    return Array.isArray(obj?.schedules) ? obj.schedules : [];
                case 5:
                    return Array.isArray(obj?.quicklinkName) ? obj.quicklinkName : [];
                case 6:
                    return Array.isArray(obj?.fitnessVideoName) ? obj.fitnessVideoName : [];
                case 8:
                    return Array.isArray(obj?.eventName) ? obj.eventName : [];
                case 10:
                    return Array.isArray(obj?.userNames) ? obj.userNames : [];
                case 11:
                    return Array.isArray(obj?.quizName) ? obj.quizName : [];
                case 15:
                    return Array.isArray(obj?.RemName) ? obj.RemName : [];
                default:
                    return [];
            }
        }
        return [];
    })
    f_module_items_value: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj.f_module_report_type && obj.f_module_report_type != '' && obj.f_module_report_type != 0) {
            switch (obj.module_id) {
                case 15:
                    return Array.isArray(obj?.RemTypeName) ? obj.RemTypeName : [];
                default:
                    return [];
            }
        }
        return [];
    })
    f_module_report_type_value: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj.module_id && obj.module_id != '') {
            return appConstant.MODULE_ID_REPORT_NAME[obj.module_id] || '';
        }
        return '';
    })
    report_name?: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj.timeZoneData && obj.timeZoneData != '') {
            return obj.timeZoneData
        } else {
            return []
        }
    }) time_zone_details: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj.departmentData && Array.isArray(obj?.departmentData)) {
            return obj.departmentData
        } else {
            return []
        }
    }) department_details: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj.locationData && Array.isArray(obj?.locationData)) {
            return obj.locationData
        } else {
            return []
        }
    }) location_details: any;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
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
    @Transform(({ obj }) => {
        if (obj?.otheroptions?.trim()) {
            const value = obj.otheroptionsValue;
            if (value && typeof value === 'object' && Object.keys(value).length > 0) {
                return value;
            }
        }
        return undefined;
    })
    otheroptionsValue?: Record<string, any>;
}
