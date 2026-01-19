import { Allow } from 'class-validator';
export class GetOneMultipleChoiceQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
