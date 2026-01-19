import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessFocusDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() f_id: number;
    @Expose() code: string;
    @Expose() name: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
