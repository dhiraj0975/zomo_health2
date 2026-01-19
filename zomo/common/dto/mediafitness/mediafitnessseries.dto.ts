import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessSeriesDto {
    @Expose() id: number;
    @Expose() s_id: number;
    @Expose() org_id: number;
    @Expose() code: string;
    @Expose() name: string;
    @Expose() img: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
