import { Allow } from 'class-validator';
export class ListNumberOfLiveReportInput {
    @Allow() id?: number;
    @Allow() status?: number;
    @Allow() flage?: number;
    @Allow() report_date?: string;
}
