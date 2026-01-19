import { Allow } from 'class-validator';
export class GetOneMultipleQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
