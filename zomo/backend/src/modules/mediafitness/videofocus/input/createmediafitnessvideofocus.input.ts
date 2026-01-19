import { Allow } from 'class-validator';
export class CreateMediaFitnessVideoFocusInput {
    @Allow() id: number;
    @Allow() v_id: number;
    @Allow() f_id: number;
    @Allow() status: number;
}
