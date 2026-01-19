import { Allow } from 'class-validator';
export class CreateMediaFitnessVideoEquipmentInput {
    @Allow() id: number;
    @Allow() v_id: number;
    @Allow() e_id: number;
    @Allow() status: number;
}
