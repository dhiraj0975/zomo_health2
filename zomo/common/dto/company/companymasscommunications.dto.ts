import { Expose } from 'class-transformer';
export class CompanyMasscommunicationsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() user_role: number;
    @Expose() membership_code: string;
    @Expose() condition: string;
    @Expose() campaign_id: number;
    @Expose() event_id: number;
    @Expose() department: string;
    @Expose() location: string;
    @Expose() state: string;
    @Expose() city: string;
    @Expose() subject: string;
    @Expose() message: string;
    @Expose() request_date: string;
    @Expose() email: string;
    @Expose() status: number;
    @Expose() flage: number;
    @Expose() created_date: string;
    @Expose() updated_date: string;
}
