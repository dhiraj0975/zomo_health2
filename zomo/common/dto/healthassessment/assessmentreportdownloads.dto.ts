import {Expose, Transform, Type} from 'class-transformer';
export class AssessmentReportDownloadsDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() company_id: string;
    @Expose() searchcond: string;
    @Expose() assessment: string;
    @Expose() biometric: string;
    @Expose() srccond: string;
    @Expose() HRAbiometric: string;
    @Expose() Fbiometric: string;
    @Expose() Reset: string;
    @Expose() hracondition: string;
    @Expose() file_name: string;
    @Expose() report_type: string;
    @Expose() email: string;
    @Expose() request_from: string;
    @Expose() status: number;
    @Expose()
    created_date: string;
    @Expose()
    updated_date: string;
}
