import { Expose, Transform, Type } from 'class-transformer';
const S3_URL =  process.env.S3_URL_PROD;
export class SurveyPopupDto {
    @Expose() id: number;
    @Expose() org_id : number;
    @Expose() title: string;
    @Expose() description: string;
    @Expose() department_string: string;
    @Expose() location_string: string;
    @Expose() pass_need_text: string;
    @Expose() pass_need_desc: string;
    @Expose() pass_need_check: number;
    @Expose() fail_need_text: string;
    @Expose() fail_need_desc: string;
    @Expose() fail_need_check: number;
    @Expose() email_added: string;
    @Expose() email_setting: number;
    @Expose() additional_note: string;
    @Expose() selected_frequency: number;
    @Expose() selected_frequency_time: string;
    @Expose() selectedweekday: string;
    @Expose() show_login_time: number;
    @Expose() is_eligibility: number;
    // @Expose() popup_header_image: string;
    @Expose() show_required: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('sphiimg_') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    popup_header_image: string;
}
