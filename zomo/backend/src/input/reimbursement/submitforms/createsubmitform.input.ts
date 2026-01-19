import { Allow } from 'class-validator';
export class CreateReimbursementSubmitFormInput {
    @Allow() user_id: number;
    @Allow() org_id: number;
    @Allow() form_id: number;
    @Allow() activity_id: string;
    @Allow() approval_type: string;
    @Allow() notes: string;
    @Allow() attachment_req: string;
    @Allow() activity_date: string;
    @Allow() reim_amount: number;
    @Allow() status: string;
    @Allow() attachments: string;
    @Allow() added_date: string;
}
