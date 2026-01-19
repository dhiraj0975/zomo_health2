import { Allow } from 'class-validator';
export class CreateMultipleQuestionsInput {
    @Allow() question_id: number;
    @Allow() question: string;
    @Allow() answer: number;
}
