import { Allow } from 'class-validator';
export class CreateDiseaseFormCoverPageInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() form_id: number;
    @Allow() coverpage_text: string;
    @Allow() status: number;
}
