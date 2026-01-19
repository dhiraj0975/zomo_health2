import { Transform, Type, Expose } from 'class-transformer';
export class UcaManualUpcomingsDto {
    @Expose() id: number;
    @Expose() org_id : number;
    @Expose() title: string;
    @Expose() description: string;
    @Expose() link: string;
    @Expose() displayoption: number;
    @Expose() status: number;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    created_date: string;
    @Expose()
    update_date: string;
    @Expose()
    auto_remove_date: string;
}
