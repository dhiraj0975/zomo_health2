import { Allow } from 'class-validator';
export class CreateUserFormInput {
    @Allow() org_id: string;
    @Allow() is_history: string;
    @Allow() user_id: number;
    @Allow() form_id: number;
    @Allow() attachments: string;
    @Allow() decline_reason: string;
    @Allow() status: number;
    @Allow() popup_status: number;
}
