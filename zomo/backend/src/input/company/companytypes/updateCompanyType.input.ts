import { Allow } from 'class-validator';
export class UpdateCompanyTypesInput {
    @Allow() id: number;
    @Allow() company_type: string;
    @Allow() status: number;
}
