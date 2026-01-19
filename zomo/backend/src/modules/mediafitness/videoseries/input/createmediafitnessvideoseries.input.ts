import { Allow } from 'class-validator';
export class CreateMediaFitnessVideoSeriesInput {
    @Allow() id: number;
    @Allow() v_id: number;
    @Allow() s_id: number;
    @Allow() status: number;
}
