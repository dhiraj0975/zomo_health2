import { Allow } from 'class-validator';
export class CreateUserFormsAttachmentsInput {
    @Allow() attachments: string;
    @Allow() org_id: number;
    @Allow() user_id: number;
}
