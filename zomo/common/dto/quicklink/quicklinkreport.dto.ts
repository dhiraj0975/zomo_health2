import { Transform, Type, Expose } from 'class-transformer';
export class QuicklinkReportDto {
    @Expose() id: number;
    @Expose() org_id : number;
    @Expose() user_id: number;
    @Expose() membership_code: string;
    @Expose() condition: string;
    @Expose() file_name: string;
    @Expose() status: number;
    @Expose()
    request_date: string;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
}
