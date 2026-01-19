import {Allow} from "class-validator";
export class CreateCovidPassportSettingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() approval_status: number;
    @Allow() description: string;
    @Allow() created_by: number;
    @Allow() status: number;
}
