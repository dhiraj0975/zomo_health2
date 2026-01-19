import { Allow } from 'class-validator';
export class UploadCustomPointInput {
    @Allow() org_id: number;
    @Allow() campaign_id: number;
    @Allow() org_sheet_header: string;
}
