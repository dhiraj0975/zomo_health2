import { Transform, Type, Expose } from 'class-transformer';
export class HealthRequestDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() origional_file: string;
    @Expose() created_file: string;
    @Expose() schedule_id: number;
    @Expose() rejected_file: string;
    @Expose()
    request_date: string;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
    @Expose() email: string;
    @Expose() status: number = 0;
    @Expose() flage: number = 0;
    @Expose() file_error: string;
    @Expose() hash: string;
}
