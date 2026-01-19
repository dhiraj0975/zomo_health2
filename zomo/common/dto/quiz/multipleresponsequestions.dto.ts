import { Expose } from 'class-transformer';
export class QuizMultipleResponseQuestionsDto {
    @Expose() id: number;
    @Expose() question_id: number;
    @Expose() choice_1: string;
    @Expose() choice_2: string;
    @Expose() choice_3: string;
    @Expose() choice_4: string;
    @Expose() choice_5: string;
    @Expose() choice_6: string;
    @Expose() answers: string;
    @Expose() num_choices: number;
    @Expose() created: string;
    @Expose() updated: string;
}
