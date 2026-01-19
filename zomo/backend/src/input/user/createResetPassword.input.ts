import {Allow} from 'class-validator';
export class CreateResetPasswordInput {
    @Allow() user_id: string;
    @Allow() old_password: string;
    @Allow() new_password: string;
    @Allow() email: number;
}
