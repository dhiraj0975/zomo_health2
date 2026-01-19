import { Allow } from 'class-validator';
export class CreateMediaFitnessSeriesInput {
    @Allow() id: number;
    @Allow() s_id: number;
    @Allow() org_id: number;
    @Allow() code: string;
    @Allow() name: string;
    @Allow() img: string;
    @Allow() status: number;
}
