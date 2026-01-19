import { Allow } from 'class-validator';
export class GetOneHotspotQuestionsInput {
    @Allow() id: number;
    @Allow() question_id: number;
}
