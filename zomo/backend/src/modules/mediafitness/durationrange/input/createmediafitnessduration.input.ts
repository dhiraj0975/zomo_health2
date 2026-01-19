import { Allow } from 'class-validator';
export class CreateMediaFitnessDurationInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() d_id: number;
    @Allow() code: string;
    @Allow() name: string;
    @Allow() status: number;
}
