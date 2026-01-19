import { Allow } from 'class-validator';
export class DeleteMultipleResponseQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
