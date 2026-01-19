import { Allow } from 'class-validator';
export class DeleteChallengeInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() org_id: number;
    @Allow() schedule_id: number;
    @Allow() activity_name: string;
    @Allow() sender_id: number;
    @Allow() challenge_id: number;
    @Allow() type: string;
}
