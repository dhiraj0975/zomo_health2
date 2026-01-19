import { Allow } from 'class-validator';
export class UpdateReimbursementSubmitFormInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() org_id: number;
    @Allow() form_id: number;
    @Allow() activity_id: string;
    @Allow() approval_type: string;
    @Allow() notes: string;
    @Allow() attachment_req: string;
    @Allow() attachments: string;
    @Allow() role_id: number;
    @Allow() status: number;
    @Allow() decline_reason: string;
    @Allow() act_reim_amount: number;
    @Allow() reim_amount: number;
    @Allow() approve_reim_amount: number;
    @Allow() activity_date: string;
}
