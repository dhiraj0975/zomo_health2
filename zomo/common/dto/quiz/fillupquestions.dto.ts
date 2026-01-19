import { Transform, Type, Expose } from 'class-transformer';
export class QuizFillUpQuestionsDto {
    @Expose() id: number;
    @Expose() question_id: number;
    @Expose() blank_options: string;
    @Expose() correct_blank	: string;
    @Expose() created: string;
    @Expose() updated: string;
}
