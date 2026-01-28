import { Allow } from 'class-validator';
export class EmailActionInput{
    @Allow() id: number;
    @Allow() type: string;
    @Allow() selected_mail_ids: number[] | string[];
}
