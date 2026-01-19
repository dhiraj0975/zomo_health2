import { Allow } from 'class-validator';
export class LogoutInput {
    @Allow() email: string;
    @Allow() user_login_id: number;
}
