import { Transform, Type, Expose } from 'class-transformer';
export class AuthorizedUsersDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() username: string;
    @Expose() statusDevice: string;
    @Expose() consumer_key: string;
    @Expose() consumer_secret: string;
    @Expose() token_key: string;
    @Expose() token_secret: string;
    @Expose() refresh_token: string;
    @Expose() app_name: string;
    @Expose() app_id: string;
    @Expose() device_id: number;
    @Expose() user_timezone: string;
    @Expose() created: number;
    @Expose() status: number;
    @Expose()
    date_time: string;
}
