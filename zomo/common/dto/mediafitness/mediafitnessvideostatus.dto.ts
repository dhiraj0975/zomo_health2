import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessVideoStatusDto {
    @Expose() id: number;
    @Expose() v_id: number;
    @Expose() org_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
