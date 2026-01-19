import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessVideoInstructorsDto {
    @Expose() id: number;
    @Expose() v_id: number;
    @Expose() i_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
