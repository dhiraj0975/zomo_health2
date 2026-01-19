import { Allow } from 'class-validator';
export class CreateMediaFitnessFocusInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() f_id: number;
    @Allow() code: string;
    @Allow() name: string;
    @Allow() status: number;
}
