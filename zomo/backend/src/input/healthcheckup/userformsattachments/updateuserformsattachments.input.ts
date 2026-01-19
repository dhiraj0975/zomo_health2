import { Allow } from 'class-validator';
export class UpdateUserFormsAttachmentsInput {
    @Allow() id: number;
    @Allow() user_form_id: number;
    @Allow() attachments: string;
    @Allow() status: string;
}
