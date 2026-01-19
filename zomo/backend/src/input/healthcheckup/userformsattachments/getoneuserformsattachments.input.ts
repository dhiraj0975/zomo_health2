import { Allow } from 'class-validator';
export class GetOneUserFormsAttachmentsInput {
    @Allow() id: number;
}
