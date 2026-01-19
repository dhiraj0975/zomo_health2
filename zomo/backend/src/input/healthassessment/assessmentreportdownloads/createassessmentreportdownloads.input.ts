import { Allow } from 'class-validator';
export class CreateAssessmentReportDownloadsInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() company_id: string;
    @Allow() searchcond: string;
    @Allow() assessment: string;
    @Allow() biometric: string;
    @Allow() srccond: string;
    @Allow() HRAbiometric: string;
    @Allow() Fbiometric: string;
    @Allow() Reset: string;
    @Allow() hracondition: string;
    @Allow() file_name: string;
    @Allow() report_type: string;
    @Allow() email: string;
    @Allow() request_from: string;
    @Allow() status: number;
}
