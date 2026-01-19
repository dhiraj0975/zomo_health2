import {Allow} from "class-validator";
export class CreateRegionInput {
    @Allow() id: number;
    @Allow() region_name: string;
    @Allow() state: string;
    @Allow() city: string;
    @Allow() regional_admin: number;
    @Allow() created_by: number;
    @Allow() status: number;
}