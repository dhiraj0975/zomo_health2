import { Allow } from 'class-validator';
export class CreateMediaFitnessVideoInstructorsInput {
    @Allow() id: number;
    @Allow() v_id: number;
    @Allow() i_id: number;
    @Allow() status: number;
}
