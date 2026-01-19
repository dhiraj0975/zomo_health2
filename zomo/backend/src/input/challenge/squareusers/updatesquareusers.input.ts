import { Allow } from 'class-validator';
export class UpdateSquareUsersInput {
    @Allow() id: number;
    @Allow() schedule_id: number;
    @Allow() card_id: number;
    @Allow() square_id: number;
    @Allow() user_id: number;
    @Allow() verified_userid: number;
    @Allow() verified_status: number;
    @Allow() status: number;
}
