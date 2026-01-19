import { Allow } from 'class-validator';
export class CreateCompanyTypesInput {
    @Allow() company_type: string;
    @Allow() status: number;
}
