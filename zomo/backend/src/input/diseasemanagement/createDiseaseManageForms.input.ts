import { Allow } from 'class-validator';
export class CreateDiseaseManageFormsInput {
    @Allow() id: number;
    @Allow() company_id: number;
    @Allow() disease_form_ids: string;
    @Allow() status: number;
    @Allow() deleted: number;
}
