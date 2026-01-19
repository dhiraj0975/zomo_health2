import { Allow } from 'class-validator';
export class DeleteReimbursementFormInput {
    @Allow() id: number;
    @Allow() org_id: string;
    @Allow() role_id: number;
}
