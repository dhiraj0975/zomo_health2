import { Transform, Type, Expose } from 'class-transformer';
export class CommunicationEmailAttachmentDto {
    @Expose() id: number;
    @Expose() mail_id: number;
    @Expose() attachment_type_id: number;
    @Expose() name: string;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
}
