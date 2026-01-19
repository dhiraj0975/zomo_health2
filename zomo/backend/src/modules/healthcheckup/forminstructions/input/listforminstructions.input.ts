import { Allow } from 'class-validator';
export class ListFormInstructionsInput {
    @Allow() company_id: number;
}
