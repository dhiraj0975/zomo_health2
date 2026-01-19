import { Expose } from 'class-transformer';
export class QuizQuizClicksDto {
    @Expose() id: number;
    @Expose() qz_assign_id: number;
    @Expose() user_id: string;
    @Expose() activity_id: string;
    @Expose() status: string;
    @Expose() created_date: string;
    @Expose() updated_date: string;
}
