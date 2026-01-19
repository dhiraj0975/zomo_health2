import { Allow } from 'class-validator';
export class AuthorizationInput {
    @Allow() type_of_form: string;
    @Allow() is_tobacco_user: number;
    @Allow() user_id: number;
    @Allow() signature: string;
    @Allow() user_sign_image: string;
    @Allow() activity_id: number;
    @Allow() date_completed: string;
    @Allow() form_type: string;
    @Allow() id?: number;
}