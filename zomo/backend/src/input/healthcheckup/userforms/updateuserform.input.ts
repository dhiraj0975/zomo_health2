import { Allow } from 'class-validator';
export class UpdateUserFormInput {
    @Allow() id: number;
    @Allow() org_id: string;
    @Allow() is_history: string;
    @Allow() user_id: string;
    @Allow() form_id: string;
    @Allow() zip_filename: string;
    @Allow() decline_reason: string;
    @Allow() status: number;
    @Allow() popup_status: number;
}
