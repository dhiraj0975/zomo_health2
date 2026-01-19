import { Allow } from 'class-validator';
export class CreateSpouseAgreementInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() signed: string;
    @Allow() status: number;
}
