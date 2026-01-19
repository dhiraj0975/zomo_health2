import { Allow } from 'class-validator';
export class ListReimbursementSubmitFormInput {
    @Allow() form_id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() status: string;
}
