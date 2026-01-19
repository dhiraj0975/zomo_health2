import { Transform, Type, Expose } from 'class-transformer';
export class CommunicationEmailDto {
    @Expose() id: number;
    @Expose() parent_id: number;
    @Expose() from_user_id: number;
    @Expose() subject: string;
    @Expose() email_body: string;
    @Expose() is_send: number;
    @Expose() is_spam: number;
    @Expose() is_important: number;
    @Expose() is_attachment: number;
    @Expose() is_trash: number;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
}
