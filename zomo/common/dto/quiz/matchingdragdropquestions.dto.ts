import { Transform, Type, Expose } from 'class-transformer';
export class QuizMatchingDragDropQuestionsDto {
    @Expose() id: number;
    @Expose() question_id: number;
    @Expose() question: number;
    @Expose() answer: number;
    @Expose() created: string;
    @Expose() updated: string;
}
