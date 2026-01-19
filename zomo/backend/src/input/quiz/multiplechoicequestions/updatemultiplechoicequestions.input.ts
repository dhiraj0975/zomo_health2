import { Allow } from 'class-validator';
export class UpdateMultipleChoiceQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
    @Allow() opt_1: string;
    @Allow() opt_2: string;
    @Allow() opt_3: string;
    @Allow() opt_4: string;
    @Allow() opt_5: string;
    @Allow() opt_6: string;
    @Allow() num_opts: number;
    @Allow() quest_answer: number;
}
