import { Transform, Type, Expose } from 'class-transformer';
export class CommunicationMailSchedulersDto {
    @Expose() id: number;
    @Expose() campaign_id: number;
    @Expose() from_email: string;
    @Expose() from_email_name: string;
    @Expose() to_email: string;
    @Expose() user_json: string;
    @Expose() attachment: string;
    @Expose() subject: string;
    @Expose() response_message: string;
    @Expose() role_id: number;
    @Expose() total_reschedule: number;
    @Expose() parent_campaign_id: number;
    @Expose() template_type: number;
    @Expose() template_item_id: number;
    @Expose() org_id: number;
    @Expose() org_code: string;
    @Expose() details_type: number;
    @Expose() user_role: string;
    @Expose() template_item_sub_id: string;
    @Expose() user_id: number;
    @Expose() status: number;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? new Date(value).getTime().toString() : null), {
        toClassOnly: true,
    })
    schedule_datetime: string;
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
