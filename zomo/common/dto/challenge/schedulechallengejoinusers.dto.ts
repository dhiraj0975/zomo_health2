import { Expose } from 'class-transformer';
export class ScheduleChallengeJoinUsersDto {
    @Expose() id: number;
    @Expose() schedule_id: number;
    @Expose() challenge_id: number;
    @Expose() user_id: number;
    @Expose() trek_level_id: number;
    @Expose() agreement_id: number = 0;
    @Expose() agreement_signed: string;
    @Expose() agreement_name: string;
    @Expose() in_ranking: number = 0;
    @Expose() in_park_complete: number = 0;
    @Expose() in_week_complete: number = 0;
    @Expose() relay_race_detail: string;
    @Expose() completed_lock_locations: string;
    @Expose() status: number = 1;
    @Expose() relay_race_push_detail: string;
    @Expose() added_date: string;
    @Expose() update_date: string;
}
