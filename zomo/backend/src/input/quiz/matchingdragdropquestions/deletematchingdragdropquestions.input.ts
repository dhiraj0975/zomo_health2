import { Allow } from 'class-validator';
export class DeleteMatchingDragDropQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
