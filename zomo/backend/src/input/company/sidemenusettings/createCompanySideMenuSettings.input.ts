import { Allow } from 'class-validator';
export class CreateCompanySideMenuSettingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() datasettingmenu: string;
    @Allow() showmenulist: string;
    @Allow() status: number;
}
