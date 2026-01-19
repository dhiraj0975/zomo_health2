import { Allow } from 'class-validator';
export class UpdateTrueFalseQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
    @Allow() quest_answer: number;
}
