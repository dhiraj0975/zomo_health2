import { Allow } from 'class-validator';
export class CreateInviteTempInput {
    @Allow() user_id: number;
    @Allow() org_id: number;
    @Allow() schedule_id: number;
    @Allow() added_by: number;
    @Allow() status: number;
}
