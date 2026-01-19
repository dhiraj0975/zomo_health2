import { Allow } from 'class-validator';
export class DeleteFormInstructionsInput {
    @Allow() id: number;
    @Allow() company_id: number;
}
