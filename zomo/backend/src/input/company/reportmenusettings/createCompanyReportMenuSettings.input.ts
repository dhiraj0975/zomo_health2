import { Allow } from 'class-validator';
export class CreateCompanyReportMenuSettingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() datasettingreporttype: string;
    @Allow() datasettingmenu: string;
    @Allow() status: number;
}
