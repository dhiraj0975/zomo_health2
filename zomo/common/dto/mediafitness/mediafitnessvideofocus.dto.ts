import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessVideoFocusDto {
    @Expose() id: number;
    @Expose() v_id: number;
    @Expose() f_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
