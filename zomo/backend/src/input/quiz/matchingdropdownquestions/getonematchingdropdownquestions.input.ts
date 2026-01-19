import { Allow } from 'class-validator';
export class GetOneMatchingDropDownQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
