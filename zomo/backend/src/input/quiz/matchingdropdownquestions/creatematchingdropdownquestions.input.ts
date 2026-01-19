import { Allow } from 'class-validator';
export class CreateMatchingDropDownQuestionsInput {
    @Allow() question_id: number;
    @Allow() drop_options: string;
    @Allow() num_drop_opts: string;
    @Allow() right_answer: string;
}
