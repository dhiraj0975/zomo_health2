import { Allow } from 'class-validator';
export class GetOneQuickLinkReportInput {
    @Allow() id: number;
    @Allow() org_id: number;
}
