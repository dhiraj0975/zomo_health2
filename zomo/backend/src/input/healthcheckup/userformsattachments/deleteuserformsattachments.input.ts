import { Allow } from 'class-validator';
export class DeleteUserFormsAttachmentsInput {
    @Allow() user_form_id: number;
}
