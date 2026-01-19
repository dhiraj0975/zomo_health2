import { Expose } from 'class-transformer';
export class QuizMultipleQuestionsDto {
    @Expose() id: number;
    @Expose() question_id: number;
    @Expose() question: string;
    @Expose() answer: number;
    @Expose() created: string;
    @Expose() updated: string;
}
