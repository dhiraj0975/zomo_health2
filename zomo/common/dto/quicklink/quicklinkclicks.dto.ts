import { Transform, Type, Expose } from 'class-transformer';
export class QuicklinkClicksDto {
    @Expose() id: number;
    @Expose() quicklink_id : number;
    @Expose() user_id: number;
    @Expose() activity_id: number;
    @Expose() status: number;
    @Expose() created_date: string;
    @Expose() updated_date: string;
}
