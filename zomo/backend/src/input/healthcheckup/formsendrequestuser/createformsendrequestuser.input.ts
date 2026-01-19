import { Allow } from 'class-validator';
export class CreateFormSendRequestUserInput {
    @Allow() id: number;
    @Allow() name: string;
    @Allow() username: string;
    @Allow() email: string;
    @Allow() email_status: number;
    @Allow() file: string;
    @Allow() status: number;
    @Allow() request_id: number;
    @Allow() updated_by: number;
    @Allow() user_id: number;
    @Allow() org_id: number;
    @Allow() response_message: string;
}
