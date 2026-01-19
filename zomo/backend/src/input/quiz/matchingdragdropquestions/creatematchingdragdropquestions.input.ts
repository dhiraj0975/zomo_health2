import { Allow } from 'class-validator';
export class CreateMatchingDragDropQuestionsInput {
    @Allow() question_id: number;
    @Allow() question: string;
    @Allow() answer	: string;
}
