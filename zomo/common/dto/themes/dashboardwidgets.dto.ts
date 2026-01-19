import { Expose } from 'class-transformer';
export class DashboardWidgetsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() leftdiv: string;
    @Expose() rightdiv: string;
    @Expose() added_date: string;
    @Expose() updated_date: string;
}
