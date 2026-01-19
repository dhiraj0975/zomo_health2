import { Allow } from 'class-validator';
export class FormListCreateFormsInput {
    @Allow() org_id: number;
}
