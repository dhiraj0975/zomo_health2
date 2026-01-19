import { Allow } from 'class-validator';
export class UpdateQuickLinkReportInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() membership_code: string;
    @Allow() file_name: string;
    @Allow() condition: string;
    @Allow() request_date: string;
    @Allow() status: string;
}
