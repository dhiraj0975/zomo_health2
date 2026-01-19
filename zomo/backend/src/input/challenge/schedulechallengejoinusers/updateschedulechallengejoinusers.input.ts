import { Allow } from 'class-validator';
export class UpdateScheduleChallengeJoinUsersInput {
    @Allow() id: number;
    @Allow() schedule_id: number;
    @Allow() challenge_id: number;
    @Allow() user_id: number;
    @Allow() trek_level_id: number;
    @Allow() agreement_id: number;
    @Allow() agreement_signed: string;
    @Allow() signature_type: number;
    @Allow() agreement_name: string;
    @Allow() in_ranking: number;
    @Allow() in_park_complete: number;
    @Allow() in_week_complete: number;
    @Allow() relay_race_detail: string;
    @Allow() completed_lock_locations: string;
    @Allow() status: number;
    @Allow() relay_race_push_detail: string;
}
