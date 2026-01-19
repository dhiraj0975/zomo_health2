import { Allow } from 'class-validator';
export class CreateCommunicationEmailToInput {
    @Allow() id: number;
    @Allow() mail_id: number;
    @Allow() user_id: number;
    @Allow() is_important: number;
    @Allow() is_spam: number;
    @Allow() is_trash: number;
    @Allow() is_send: number;
    @Allow() status: number;
}
