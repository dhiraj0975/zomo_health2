import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessVideoEquipmentDto {
    @Expose() id: number;
    @Expose() v_id: number;
    @Expose() e_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
