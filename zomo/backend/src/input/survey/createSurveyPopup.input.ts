import { Allow } from 'class-validator';
export class CreateSurveyPopupInput {
    @Allow() id: number;
    @Allow() org_id : number;
    @Allow() title: string;
    @Allow() description: string;
    @Allow() department_string: string;
    @Allow() location_string: string;
    @Allow() pass_need_text: string;
    @Allow() pass_need_desc: string;
    @Allow() pass_need_check: number;
    @Allow() fail_need_text: string;
    @Allow() fail_need_desc: string;
    @Allow() fail_need_check: number;
    @Allow() email_added: string;
    @Allow() email_setting: number;
    @Allow() additional_note: string;
    @Allow() selected_frequency: number;
    @Allow() selected_frequency_time: string;
    @Allow() selectedweekday: string;
    @Allow() show_login_time: number;
    @Allow() is_eligibility: number;
    @Allow() popup_header_image: string;
    @Allow() show_required: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
