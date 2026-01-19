import { Expose } from 'class-transformer';
export class QuizTrueFalseQuestionsDto {
    @Expose() id: number;
    @Expose() question_id: number
    @Expose() quest_answer: number
    @Expose() created: string
    @Expose() updated: string
}
