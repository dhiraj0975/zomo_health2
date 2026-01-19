import { Expose, Transform, Type } from 'class-transformer';
const S3_URL =  process.env.S3_URL_PROD
export class CompanySettingsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() broker_code: string;
    @Expose() eligibility: number;
    @Expose() img_option: number;
    @Expose() img_area: number;
    @Expose() slider_limit: number;
    @Expose() ssn: number;
    @Expose() is_reqd_ssn: number;
    @Expose() employee_id: number;
    @Expose() is_reqd_empid: number;
    @Expose() allow_username: number;
    @Expose() allow_password: number;
    @Expose() first_login_by: number;
    @Expose() pre_first_login_by: string;
    @Expose() block_registration: number;
    @Expose() lock_username: number;
    @Expose() spouse_widget: number;
    @Expose() spouse_option: number;
    @Expose() wellnessprog_name: string;
    @Expose() editable_pdf: number;
    @Expose() e_timezone_setting: number;
    @Expose() user_form_setting: number;
    @Expose() chat_setting: number;
    @Expose() video_setting: number;
    @Expose() video_action: number;
    @Expose() agreement_status: number;
    @Expose() passport_menu: number;
    @Expose() covid_menu: number;
    @Expose() allow_du_login: number;
    @Expose() allow_ds_login: number;
    @Expose() chat_with_coach: number;
    @Expose() chat_type: number;
    @Expose() form_limit: number;
    @Expose() show_quicklink_in_sidebar: number;
    @Expose() is_emo_health_asssessments: number;
    @Expose() pointsleaderboard: number;
    @Expose() pointsleaderboardmin: number;
    @Expose() user_popup_status: number;
    @Expose() dashboard_point_leaboard: number;
    @Expose() campaign_id: number;
    @Expose() health_a_based_on: number;
    @Expose() ha_biomatricstep_hs: number;
    @Expose() spouse_email_collection_on_off: number;
    @Expose() spouse_email_collection_required: number;
    @Expose() census_status: number;
    @Expose() plan_order: number;
    @Expose() health_form_popup: number;
    @Expose() health_form_mail: number;
    @Expose() hide_assessment: number;
    @Expose() is_internationalization: number;
    @Expose() pointsleaderboardpopup: number;
    @Expose() enable_popup: number;
    @Expose() enable_logo: number;
    @Expose() title: string;
    @Expose() frequency_type: number;
    @Expose() popup_based_on: number;
    @Expose() reset_password_mandatory: number;
    @Expose() data_limit: number;
    @Expose() is_zomo_on: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('infologo') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    logo_image: string;
}
