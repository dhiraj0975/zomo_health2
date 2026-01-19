import { Transform, Type, Expose } from 'class-transformer';
export class AcOlympicDataDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() schedule_id: number;
    @Expose() activity_id: number;
    @Expose() activity_cus_desc: string;
    @Expose() minutes: number;
    @Expose()
    added_date: string;
    @Expose() status?: number;
}
