import { Allow } from 'class-validator';
export class CreateDiseaseInput {
    @Allow() id: number;
    @Allow() title: string;
    @Allow() desc: string;
    @Allow() forms_order: string;
    @Allow() weight: number;
    @Allow() status: number;
}
