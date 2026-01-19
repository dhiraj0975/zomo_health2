import { Transform, Type, Expose } from 'class-transformer';
export class MediaFitnessVideoClickDto {
    @Expose() id: number;
    @Expose() v_id: number;
    @Expose() user_id: number;
    @Expose() activity_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
