import { Transform, Type, Expose } from 'class-transformer';
export class UserFormsAttachmentsDto {
    @Expose() id: number;
    @Expose() user_form_id: number;
    @Expose() name: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
