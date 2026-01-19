import { Allow } from 'class-validator';
export class UpdateTeamScheduleInput {
    @Allow() id: number;
    @Allow() team_id: number;
    @Allow() schedule_id: number;
    @Allow() status: number;
}
