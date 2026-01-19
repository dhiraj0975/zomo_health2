import { Allow } from 'class-validator';
export class CreateMediaFitnessVideoClickInput {
    @Allow() id: number;
    @Allow() v_id: number;
    @Allow() user_id: number;
    @Allow() activity_id: number;
    @Allow() status: number;
}
