import { Allow } from 'class-validator';
export class CreateMediaFitnessEquipmentInput {
    @Allow() id: number;
    @Allow() e_id: number;
    @Allow() org_id: number;
    @Allow() quantity: number;
    @Allow() code: string;
    @Allow() name: string;
    @Allow() status: number;
}
