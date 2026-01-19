import { Expose, Transform, Type } from 'class-transformer';
export class CardsDto {
    @Expose() id: number;
    @Expose() schedule_id: number;
    @Expose() org_id: number;
    @Expose() name: string;
    @Expose() description: string;
    @Expose() parent_id: number;
    @Expose() order_no: number;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
    @Expose()
    @Transform(({ obj }) => (obj.square ? obj.square.length : 0 ), { toClassOnly: true })
    square_count: any;
}
