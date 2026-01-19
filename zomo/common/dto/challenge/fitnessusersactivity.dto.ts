import { Expose } from 'class-transformer';
export class FitnessUsersActivityDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() ftns_activity_id: number;
    @Expose() ftns_my_entry: string;
    @Expose() schedule_id: number;
    @Expose() schedule_join_id: number;
    @Expose() status: number;
    @Expose() added_date: string;
    @Expose() modified_date: string;
}
