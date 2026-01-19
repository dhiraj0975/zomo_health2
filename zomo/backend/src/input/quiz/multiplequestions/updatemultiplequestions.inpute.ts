import { Allow } from 'class-validator';
export class UpdateMultipleQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
    @Allow() question: string;
    @Allow() answer: number;
}
