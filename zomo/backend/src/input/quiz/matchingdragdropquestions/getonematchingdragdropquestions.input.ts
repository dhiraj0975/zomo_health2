import { Allow } from 'class-validator';
export class GetOneMatchingDragDropQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
