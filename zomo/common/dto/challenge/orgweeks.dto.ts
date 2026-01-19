import { Expose } from 'class-transformer';
export class OrgWeeksDto {
    @Expose() id: number;
    @Expose() challenge_id: number;
    @Expose() activity_id: number;
    @Expose() site_activity_desc: string;
    @Expose() manual_activity: string;
    @Expose() manual_desc: string;
    @Expose() completion_status: number = 1;
    @Expose() log_status: number = 0;
    @Expose() meal: string;
    @Expose() amount: number;
    @Expose() quantity: number;
    @Expose() steps: string;
    @Expose() duration: string;
    @Expose() distance: string;
    @Expose() calories: string;
    @Expose() tabacco_status: string;
    @Expose() avalue: number;
    @Expose() waterlogunit: string;
    @Expose() m_numeric: string;
    @Expose() m_short: string;
    @Expose() m_long: string;
    @Expose() m_yesno: string;
    @Expose() m_check: string;
    @Expose() m_field: string;
    @Expose() status: number = 1;
}
