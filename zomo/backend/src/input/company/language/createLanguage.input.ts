import { Allow } from 'class-validator';
export class CreateLanguageInput {
    @Allow() id: number;
    @Allow() company_id: number;
    @Allow() language_id: string;
    @Allow() status: number;
}
