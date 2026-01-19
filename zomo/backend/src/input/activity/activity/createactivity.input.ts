import { Allow } from 'class-validator';
export class CreateActivityInput {
    @Allow() id: number;
    @Allow() role_id: number;
    @Allow() org_id: number;
    @Allow() activity_name: string;
    @Allow() activity_display: number;
    @Allow() category_id: number;
    @Allow() accebility: number;
    @Allow() created_by: number;
    @Allow() plugin: string;
    @Allow() controller: string;
    @Allow() action: string;
    @Allow() newlink: string;
    @Allow() ext_link: string;
    @Allow() description: string;
    @Allow() enable_activity_tracker: number;
    @Allow() enable_reimbursement: number;
    @Allow() is_age_common: number;
    @Allow() status: number;
}
