import { Transform, Type, Expose } from 'class-transformer';
export class DaysUsersDto {
    @Expose() id: number;
    @Expose() schedule_id: number;
    @Expose() user_id: number;
    @Expose() week_id: number;
    @Expose() day_id: number;
    @Expose() activity_id: number;
    @Expose() challenge_id: number;
    @Expose() site_activity_desc: string;
    @Expose() manual_activity: string;
    @Expose() manual_desc: string;
    @Expose() completion_status: string;
    @Expose() log_status: string;
    @Expose() linkstatus: number = 0;
    @Expose() meal: string;
    @Expose() amount: string;
    @Expose() quantity: string;
    @Expose() steps: string;
    @Expose() duration: string;
    @Expose() distance: string;
    @Expose() calories: string;
    @Expose() tabacco_status: string;
    @Expose() avalue: string;
    @Expose() waterlogunit: string;
    @Expose() m_numeric: string;
    @Expose() m_short: string;
    @Expose() m_long: string;
    @Expose() m_yesno: string;
    @Expose() m_check: string;
    @Expose() m_field: string;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    added_date: string;
    @Expose()
    update_date: string;
    @Expose() status: number = 0;
}
