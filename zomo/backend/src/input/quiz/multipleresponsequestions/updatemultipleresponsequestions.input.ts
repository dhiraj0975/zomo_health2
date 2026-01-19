import { Allow } from 'class-validator';
export class UpdateMultipleResponseQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
    @Allow() choice_1: string;
    @Allow() choice_2: string;
    @Allow() choice_3: string;
    @Allow() choice_4: string;
    @Allow() choice_5: string;
    @Allow() choice_6: string;
    @Allow() answers: string;
    @Allow() num_choices: number;
}
