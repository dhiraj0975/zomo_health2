import { Allow } from 'class-validator';
export class UpdateMatchingDragDropQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
    @Allow() question: string;
    @Allow() answer	: string;
}
