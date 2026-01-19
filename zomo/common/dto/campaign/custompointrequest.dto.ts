import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
import { CampaignActivityDto } from '.';
export class CustomPointRequestDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() campaign_id: number;
    @Expose() status: number;
    @Expose() total_download: string;
    @Expose() hash: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    request_date: string;
    @Expose()
    original_file: string;
    @Expose()
    rejected_file: string;
    @Expose()
    success_file: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}