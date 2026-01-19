import { Allow } from 'class-validator';
export class CreateCommunicationEmailAttachmentInput {
    @Allow() id: number;
    @Allow() mail_id: number;
    @Allow() attachment_type_id: number;
    @Allow() name: string;
    @Allow() status: number;
}
