import { Transform, Type, Expose } from 'class-transformer';
export class CompanyReportMenuSettingsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() datasettingreporttype: string;
    @Expose() datasettingmenu: string;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
}
