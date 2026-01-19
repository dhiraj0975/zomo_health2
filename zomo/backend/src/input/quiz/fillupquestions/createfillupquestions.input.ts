import { Allow } from 'class-validator';
export class CreateFillUpQuestionsInput {
    @Allow() question_id: number;
    @Allow() blank_options: string;
    @Allow() correct_blank: string;
}
