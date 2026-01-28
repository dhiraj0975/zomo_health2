import { Transform, Type, Expose } from 'class-transformer';
const moment = require('moment-timezone');
export class CommunicationEmailCampaignRequestsDto {
    @Expose() id: number;
    @Expose() subject: string;
    @Expose() file: string;
    @Expose() from_email_id: number;
    @Expose() template_content: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => {
        if (!value || value === 'null' || value === '0000-00-00 00:00:00') {
            return null;
        }
        const date = moment(value);
        if (date.isValid()) {
            return date.format('MM-DD-YYYY hh:mm A');
        }
        return value;
    }, {
        toClassOnly: true,
    })
    schedule_datetime: string;
    @Expose() interval_from: string;
    @Expose() interval_to: string;
    @Expose() success_count: number;
    @Expose() fail_count: number;
    @Expose() sheet_header: string;
    @Expose() hash: string;
    @Expose() timezone: string;
    @Expose() test_mail_user_data: string;
    @Expose() campaign_title: string;
    @Expose() request_status: number;
    @Expose() attachment: string;
    @Expose() request_flag: number;
    @Expose() duplicate_record: number;
    @Expose() total_reschedule: number;
    @Expose() role_id: number;
    @Expose() approval_status: number;
    @Expose() approval_status_data: string;
    @Expose() testemail: string;
    @Expose() sendtestmailstatus: number;
    @Expose() for_org_id: number;
    @Expose() with_option: number;
    @Expose() org_filter_data: string;
    @Expose() use_def_tem_id: number;
    @Expose() group_id: number;
    @Expose() parent_id: number;
    @Expose() template_type: number;
    @Expose() template_item_id: number;
    @Expose() copied: number;
    @Expose() details_type: number;
    @Expose() test_user_role: string;
    @Expose() template_item_sub_id: string;
    @Expose() test_user_id: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? new Date(value).getTime().toString() : null), {
        toClassOnly: true,
    })
    schedule_utc_datetime: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? new Date(value).getTime().toString() : null), {
        toClassOnly: true,
    })
    created_date: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? new Date(value).getTime().toString() : null), {
        toClassOnly: true,
    })
    updated_date: string;
}
