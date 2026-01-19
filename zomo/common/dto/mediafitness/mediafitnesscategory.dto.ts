import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessCategoryDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() cat_id: number;
    @Expose() code: string;
    @Expose() name: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
