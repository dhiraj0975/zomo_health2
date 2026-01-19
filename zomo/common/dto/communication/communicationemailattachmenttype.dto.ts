import { Transform, Type, Expose } from 'class-transformer';
export class CommunicationEmailAttachmentTypeDto {
    @Expose() id: number;
    @Expose() type: string;
    @Expose() mime: string;
    @Expose() icon: string;
    @Expose() extension: string;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
}
