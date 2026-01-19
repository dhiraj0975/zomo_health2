import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessVideoCategoryDto {
    @Expose() id: number;
    @Expose() v_id: number;
    @Expose() c_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
