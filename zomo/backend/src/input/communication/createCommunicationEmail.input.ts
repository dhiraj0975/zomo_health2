import { Allow } from 'class-validator';
export class CreateCommunicationEmailInput {
    @Allow() id: number;
    @Allow() parent_id: number;
    @Allow() from_user_id: number;
    @Allow() subject: string;
    @Allow() email_body: string;
    @Allow() is_send: number;
    @Allow() is_spam: number;
    @Allow() is_important: number;
    @Allow() is_attachment: number;
    @Allow() is_trash: number;
    @Allow() status: number;
}
