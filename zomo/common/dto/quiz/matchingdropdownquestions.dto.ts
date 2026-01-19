import { Transform, Type, Expose } from 'class-transformer';
export class QuizMatchingDropDownQuestionsDto {
    @Expose() id: number;
    @Expose() question_id: number;
    @Expose() drop_options: string;
    @Expose() num_drop_opts: string;
    @Expose() right_answer: string;
    @Expose() created: string;
    @Expose() updated: string;
}
