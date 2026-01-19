import { Allow } from 'class-validator';
export class CreateMediaFitnessVideoCategoryInput {
    @Allow() id: number;
    @Allow() v_id: number;
    @Allow() c_id: number;
    @Allow() status: number;
}
