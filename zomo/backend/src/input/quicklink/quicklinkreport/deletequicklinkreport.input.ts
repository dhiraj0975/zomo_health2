import { Allow } from 'class-validator';
export class DeleteQuickLinkReportInput {
    @Allow() id: number;
    @Allow() org_id: number;
}
