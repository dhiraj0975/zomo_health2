import { Allow } from 'class-validator';
export class DeleteFillUpQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
