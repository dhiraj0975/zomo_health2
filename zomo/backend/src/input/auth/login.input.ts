import { Allow } from 'class-validator';
export class LoginInput {
    @Allow() email: string;
    @Allow() password: string;
    @Allow() role_id: number;
    @Allow() reCaptchaToken: string;
    @Allow() token: string;
    @Allow() remember_me: number;
    @Allow() auto_login: number;
    @Allow() id: string;
}
