import { Allow } from 'class-validator';
export class CreateChampaignChallengeInput {
    @Allow() id: number;
    @Allow() campaign_id: number;
    @Allow() challenge_id: number;
    @Allow() challenge_schedule_id: number;
    @Allow() reward_id: number;
    @Allow() reward_for: number;
    @Allow() point: string;
    @Allow() start_date: string;
    @Allow() end_date: string;
    @Allow() status: number;
    @Allow() point_end_date: string;
    @Allow() after_deadline_date: string;
    @Allow() consider_after_deadline: number;
}
