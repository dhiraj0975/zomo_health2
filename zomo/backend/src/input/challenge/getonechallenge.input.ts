import { Allow } from 'class-validator';
export class GetOneChallengeInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() team_id: number;
    @Allow() org_id: number;
    @Allow() schedule_id: number;
    @Allow() challenge_id: number;
}
