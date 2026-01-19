import {Allow} from 'class-validator';
export class EmployeeExportInput {
    @Allow() membership_code: string;
    @Allow() user_id: number;
    @Allow() org_id: number;
}