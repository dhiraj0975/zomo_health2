import { Allow } from 'class-validator';
export class CreateReimbursementFormsInput {
    @Allow() id: number;
    @Allow() title: string;
    @Allow() org_id: number;
    @Allow() activity_id: string;
    @Allow() activity_date: number;
    @Allow() attachments: number;
    @Allow() attachment_req: number;
    @Allow() multiple_selection: number;
    @Allow() description: string;
    @Allow() act_reim_amount: number;
    @Allow() approval_type: number;
    @Allow() created_by: number;
    @Allow() status: number;
    @Allow() deleted: number;
}
