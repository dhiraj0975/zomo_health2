import { Allow } from 'class-validator';
export class CreateTeamScheduleInput {
    @Allow() team_id: number;
    @Allow() schedule_id: number;
    @Allow() status: number;
}
