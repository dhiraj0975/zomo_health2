import { Allow } from 'class-validator';
export class DeleteHotspotQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
