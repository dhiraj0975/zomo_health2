import { Expose } from 'class-transformer';
export class QuizMultipleChoiceQuestionsDto {
    @Expose() id: number;
    @Expose() question_id: number;
    @Expose() opt_1: string;
    @Expose() opt_2: string;
    @Expose() opt_3: string;
    @Expose() opt_4: string;
    @Expose() opt_5: string;
    @Expose() opt_6: string;
    @Expose() num_opts: number;
    @Expose() quest_answer: number;
    @Expose() created: string;
    @Expose() updated: string;
}
