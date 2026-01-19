import { Allow } from 'class-validator';
export class CreateMediaFitnessVideoStatusInput {
    @Allow() id: number;
    @Allow() v_id: number;
    @Allow() org_id: number;
    @Allow() status: number;
}
