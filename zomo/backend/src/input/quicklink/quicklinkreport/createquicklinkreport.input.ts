import { Allow } from 'class-validator';
export class CreateQuickLinkReportInput {
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() membership_code: string;
    @Allow() file_name: string;
    @Allow() condition: string;
    @Allow() request_date: string;
}
