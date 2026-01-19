import { Transform, Type, Expose } from 'class-transformer';
export class BioWeightDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() weight: string;
    @Expose() schedule_id: number;
    @Expose() schedule_join_id: number;
    @Expose() status: number;
    @Expose()
    added_date: string;
}
