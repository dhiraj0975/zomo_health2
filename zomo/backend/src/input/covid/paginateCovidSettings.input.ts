import {Allow} from "class-validator";
export class PaginateCovidSettingsInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() org_id: number;
    @Allow() email_setting: number;
}
