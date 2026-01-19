import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessVideoSeriesDto {
    @Expose() id: number;
    @Expose() v_id: number;
    @Expose() s_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
