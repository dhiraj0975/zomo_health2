import { Allow } from 'class-validator';
export class CreateCommunicationMailSchedulersInput {
    @Allow() id: number;
    @Allow() campaign_id: number;
    @Allow() from_email: string;
    @Allow() from_email_name: string;
    @Allow() to_email: string;
    @Allow() user_json: string;
    @Allow() attachment: string;
    @Allow() subject: string;
    @Allow() response_message: string;
    @Allow() schedule_datetime: string;
    @Allow() role_id: number;
    @Allow() total_reschedule: number;
    @Allow() parent_campaign_id: number;
    @Allow() template_type: number;
    @Allow() template_item_id: number;
    @Allow() org_id: number;
    @Allow() org_code: string;
    @Allow() details_type: number;
    @Allow() user_role: string;
    @Allow() template_item_sub_id: string;
    @Allow() user_id: number;
    @Allow() status: number;
}
