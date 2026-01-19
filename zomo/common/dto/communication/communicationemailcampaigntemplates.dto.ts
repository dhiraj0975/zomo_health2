import { Transform, Type, Expose } from 'class-transformer';
export class CommunicationEmailCampaignTemplatesDto {
    @Expose() id: number;
    @Expose() subject: string;
    @Expose() template_content: string;
    @Expose() role_id: number;
    @Expose() temp_type: number;
    @Expose() org_id: number;
    @Expose() go_type: number;
    @Expose() created_name: string;
    @Expose() org_name: string;
    @Expose() details_type: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? new Date(value).getTime().toString() : null), {
        toClassOnly: true,
    })
    created_date: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? new Date(value).getTime().toString() : null), {
        toClassOnly: true,
    })
    updated_date: string;
}
