import { Allow } from 'class-validator';
export class FormListReimbursementCreateFormsInput {
    @Allow() org_id: number;
}
