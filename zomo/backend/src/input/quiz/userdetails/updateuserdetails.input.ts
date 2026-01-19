import { Allow } from 'class-validator';
export class UpdateUserDetailsInput {
    @Allow() id: number;
    @Allow() user_name: string;
    @Allow() user_email: string;
    @Allow() membership_code: string;
    @Allow() user_id: number;
    @Allow() quiz_cat: number;
    @Allow() quiz_id: number;
    @Allow() pause: number;
    @Allow() score: number;
    @Allow() completed: string;
    @Allow() total_questions: string;
    @Allow() activity_id: number;
    @Allow() ptime: string;
    @Allow() timezone_name: string;
    @Allow() status: number;
}
