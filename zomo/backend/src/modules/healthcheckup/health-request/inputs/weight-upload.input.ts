import { Allow } from 'class-validator';
export class healthUploadInput {
    @Allow() org_sheet_header: string;
    @Allow() mail_status: number;
}
