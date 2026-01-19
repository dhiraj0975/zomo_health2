import { Allow } from 'class-validator';
export class CreateManageDiseaseInput {
    @Allow() id: number;
    @Allow() disease_id: string;
    @Allow() company_id: number;
    @Allow() disease_form_ids: string;
    @Allow() coverpage_text: string;
    @Allow() instructions_text: string;
    @Allow() start_date: string;
    @Allow() end_date: string;
    @Allow() fax_date: string;
    @Allow() status: number;
    @Allow() deleted: number;
}
