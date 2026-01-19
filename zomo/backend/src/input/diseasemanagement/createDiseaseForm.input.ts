import { Allow } from 'class-validator';
export class CreateDiseaseFormInput {
    @Allow() id: number;
    @Allow() code: string;
    @Allow() title: string;
    @Allow() disease_id: number;
    @Allow() coverpage_text: string;
    @Allow() instructions_text: string;
    @Allow() standard_id: string;
    @Allow() status: number;
}
