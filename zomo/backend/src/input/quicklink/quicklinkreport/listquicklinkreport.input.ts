import { Allow } from 'class-validator';
export class ListQuickLinkReportInput {
    @Allow() org_id: number;
    @Allow() membership_code: string;
    @Allow() condition: string;
    @Allow() file_name: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() search_str: string;
}
