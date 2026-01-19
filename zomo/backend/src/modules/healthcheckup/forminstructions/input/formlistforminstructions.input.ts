import { Allow } from 'class-validator';
export class FormListFormInstructionsInput {
    @Allow() company_id: number;
}
