import { Allow } from 'class-validator';
export class GetOneTrueFalseQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
