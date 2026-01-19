import {Allow} from "class-validator";
export class CovidVaccinationTypeInput {
    @Allow() id: number;
    @Allow() org_id: string;
    @Allow() title: string;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
}
