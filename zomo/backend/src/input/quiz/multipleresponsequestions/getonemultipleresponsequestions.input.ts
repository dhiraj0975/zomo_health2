import { Allow } from 'class-validator';
export class GetOneMultipleResponseQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
