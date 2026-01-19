import {Allow} from "class-validator";
export class CreateBrokerInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: string;
    @Allow() broker_admin_id: number;
    @Allow() location: number;
    @Allow() department: number;
    @Allow() state: string;
    @Allow() city: string;
    @Allow() is_global: number;
    @Allow() region_id: number;
    @Allow() region_admin: number;
    @Allow() status: number;
    @Allow() assign_orgs: string;
}
