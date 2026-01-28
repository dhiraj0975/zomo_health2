import { Allow } from 'class-validator';
export class DraftEmailInput {
    @Allow() id: number;
    @Allow() parent_id: number;
    @Allow() subject: string;
    @Allow() description: string;
    @Allow() email_to: number[] | string[];
}
