import { Allow } from 'class-validator';
export class CreateMediaFitnessCategoryInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() cat_id: number;
    @Allow() code: string;
    @Allow() name: string;
    @Allow() status: number;
}
