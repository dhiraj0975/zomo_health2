import { Expose } from 'class-transformer';
export class TeamScheduleDto {
    @Expose() id: number;
    @Expose() team_id: number;
    @Expose() schedule_id: number;
    @Expose() status: number = 1;
    @Expose() added_date: string;
    @Expose() update_date: string;
}
