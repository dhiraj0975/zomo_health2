import {Expose, Transform, Type} from 'class-transformer';
import {MyPlanPlansDto} from "@common-constants";
const S3_URL =  process.env.S3_URL_PROD

export class PlanReportPaginateDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() request_date: string;
    @Expose() status: number;
    @Expose() label_status: string;
    @Expose() plan: string;
    @Expose() file_name: string;
    @Expose() companies: string;
}
