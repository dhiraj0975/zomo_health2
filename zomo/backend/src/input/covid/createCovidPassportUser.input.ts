import {Allow} from "class-validator";
export class CreateCovidPassportUserInput {
    @Allow() id: number;
    @Allow() title: string;
    @Allow() attachment: string;
    @Allow() description: string;
    @Allow() org_id: number;
    @Allow() approval_status: number;
    @Allow() created_by: number;
    @Allow() status: number;
    @Allow() is_show_dashboard: number;
}
