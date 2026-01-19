import { Allow } from 'class-validator';
export class weightUploadInput {
    @Allow() org_id: number;
    @Allow() org_sheet_header: string;
    @Allow() mail_status: number;
}
