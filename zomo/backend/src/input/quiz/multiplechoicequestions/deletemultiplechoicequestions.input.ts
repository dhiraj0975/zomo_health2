import { Allow } from 'class-validator';
export class DeleteMultipleChoiceQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
