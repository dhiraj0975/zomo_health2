import { Allow } from 'class-validator';
export class GetoneFillUpQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
