import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessDurationRangeDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() d_id: number;
    @Expose() code: string;
    @Expose() name: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
