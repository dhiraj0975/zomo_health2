import { Allow } from 'class-validator';
export class DeleteTrueFalseQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
