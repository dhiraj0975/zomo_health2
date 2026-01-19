import { Allow } from 'class-validator';
export class DeleteMultipleQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
