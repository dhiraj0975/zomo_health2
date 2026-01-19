import { Allow } from 'class-validator';
export class UpdateFillUpQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
    @Allow() blank_options: string;
    @Allow() correct_blank: string;
}
