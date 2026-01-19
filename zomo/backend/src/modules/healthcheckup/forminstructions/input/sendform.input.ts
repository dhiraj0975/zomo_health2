import { Allow } from 'class-validator';
export class SendFormInput {
    @Allow() company_id: number;
    @Allow() check_all: number;
    @Allow() program_selection: string;
    @Allow() selectedids: string;
}
