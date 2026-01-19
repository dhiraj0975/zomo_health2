import { Expose } from 'class-transformer';
const S3_URL =  process.env.S3_URL_PROD

export class IncentiveReportRequestPaginateDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() request_date: string;
    @Expose() status: number;
    @Expose() label_status: string;
    @Expose() report_type: string;
    @Expose() system_type: string;
    @Expose() campaignNameList: string;
    @Expose() file_name: string;
    @Expose() companies: string;
}
