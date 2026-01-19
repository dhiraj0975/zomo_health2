import { Allow } from 'class-validator';
export class CreateDiseaseStandardCareInput {
    @Allow() id: number;
    @Allow() disease_id: number;
    @Allow() title: string;
    @Allow() desc: string;
    @Allow() status: number;
}
