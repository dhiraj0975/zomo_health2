import { Allow } from 'class-validator';
export class CreateAuthorizedUsersInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() username: string;
    @Allow() statusDevice: string;
    @Allow() consumer_key: string;
    @Allow() consumer_secret: string;
    @Allow() token_key: string;
    @Allow() token_secret: string;
    @Allow() refresh_token: string;
    @Allow() app_name: string;
    @Allow() app_id: string;
    @Allow() device_id: number;
    @Allow() user_timezone: string;
    @Allow() date_time: string;
    @Allow() created: number;
    @Allow() status: number;
}
