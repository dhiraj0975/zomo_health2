import { Allow } from 'class-validator';
export class UpdateInviteUserInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() inviter_id: number;
    @Allow() schedule_id: number;
    @Allow() team_id: number;
    @Allow() status: number;
}
