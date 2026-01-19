import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessEquipmentDto {
    @Expose() id: number;
    @Expose() e_id: number;
    @Expose() org_id: number;
    @Expose() quantity: number;
    @Expose() code: string;
    @Expose() name: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
