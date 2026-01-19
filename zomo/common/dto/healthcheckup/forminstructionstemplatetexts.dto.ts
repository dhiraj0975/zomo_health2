import { Transform, Type, Expose } from 'class-transformer';
export class ForminstructionsTemplateTextsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() main_option: number;
    @Expose() type: number;
    @Expose() text: string;
    @Expose() status: number;
    @Expose() order: number;
    @Expose() form_type: string | number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
