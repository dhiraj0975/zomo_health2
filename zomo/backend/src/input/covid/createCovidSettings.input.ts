import {Allow} from "class-validator";
export class CreateCovidSettingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() title: string;
    @Allow() logo: string;
    @Allow() description: string;
    @Allow() department_string: string;
    @Allow() location_string: string;
    @Allow() need_checkup_text: string;
    @Allow() need_checkup_desc: string;
    @Allow() no_need_checkup_text: string;
    @Allow() no_need_checkup_desc: string;
    @Allow() status: number;
    @Allow() email_added: string;
    @Allow() email_setting: number;
    @Allow() additional_note: string;
    @Allow() symptom_traker_setting: number;
    @Allow() selected_frequency: number;
    @Allow() popup_header_image: string;
    @Allow() selected_frequency_time: string;
    @Allow() selectedweekday: string;
    @Allow() show_login_time: number;
    @Allow() is_eligibility: number;
}
