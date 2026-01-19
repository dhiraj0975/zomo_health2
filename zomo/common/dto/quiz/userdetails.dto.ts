import { Expose } from 'class-transformer';
export class QzUserDetailsDto {
    @Expose() id: number;
    @Expose() user_name: string
    @Expose() user_email: string
    @Expose() membership_code: string
    @Expose() user_id: number
    @Expose() quiz_cat: number
    @Expose() quiz_id: number
    @Expose() pause: number
    @Expose() score: number
    @Expose() completed: string
    @Expose() total_questions: string
    @Expose() activity_id: number
    @Expose() ptime: string
    @Expose() timezone_name: string
    @Expose() created_date: string
    @Expose() updated: string
    @Expose() status: number
}
