import { Allow } from 'class-validator';
export class CreateDownloadFormsInput {
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() membership_code: string;
    @Allow() condition: string;
    @Allow() form_type: string;
    @Allow() form_selection: string;
    @Allow() s_department: string;
    @Allow() s_location: string;
    @Allow() s_employee: string;
    @Allow() file_name: string;
    @Allow() total_download: string;
    @Allow() request_date: string;
    @Allow() email: string;
    @Allow() status: number;
    @Allow() displayoption: number;
    @Allow() fstart_date: string;
    @Allow() fend_date: string;
    @Allow() UserCnt: number;
    @Allow() which_system: number;
}
