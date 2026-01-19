import { Transform, Type, Expose } from 'class-transformer';
export class CommunicationEmailToDto {
    @Expose() id: number;
    @Expose() mail_id: number;
    @Expose() user_id: number;
    @Expose() is_important: number;
    @Expose() is_spam: number;
    @Expose() is_trash: number;
    @Expose() is_send: number;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
}
