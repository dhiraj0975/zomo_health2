import { Allow } from 'class-validator';
export class UpdateFitnessUsersActivityInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() ftns_activity_id: number;
    @Allow() ftns_my_entry: string;
    @Allow() schedule_id: number;
    @Allow() schedule_join_id: number;
}
