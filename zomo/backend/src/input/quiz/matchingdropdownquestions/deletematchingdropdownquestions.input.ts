import { Allow } from 'class-validator';
export class DeleteMatchingDropDownQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
