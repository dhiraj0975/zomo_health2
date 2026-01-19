import { Allow } from 'class-validator';
export class BillboardReportInput {
    @Allow() role_id?: number;
    @Allow() org_id?: number;
    @Allow() department_id?: string | string[] | number[];
    @Allow() location_id?: string | string[] | number[];
    @Allow() start_date: string;
    @Allow() end_date: string;
    @Allow() device_type?: string;
    @Allow() search_str?: string;
    @Allow() page?: number;
    @Allow() limit?: number;
    @Allow() auto_request?: number;
    @Allow() terminated_users: number;
    @Allow() result_type?: number;
}
