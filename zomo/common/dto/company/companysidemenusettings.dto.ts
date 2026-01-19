import { Transform, Type, Expose } from 'class-transformer';
export class CompanySideMenuSettingsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() datasettingmenu: string;
    @Expose() showmenulist: string;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
}
