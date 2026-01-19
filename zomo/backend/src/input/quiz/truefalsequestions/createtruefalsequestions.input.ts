import { Allow } from 'class-validator';
export class CreateTrueFalseQuestionsInput {
    @Allow() question_id: number;
    @Allow() quest_answer: number;
}
