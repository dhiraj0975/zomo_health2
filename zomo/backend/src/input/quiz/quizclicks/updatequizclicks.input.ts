import { Allow } from 'class-validator';
export class UpdateQuizClicksInput {
    @Allow() id: number;
    @Allow() qz_assign_id: number;
    @Allow() user_id: number;
    @Allow() activity_id: number;
    @Allow() status: number;
}
