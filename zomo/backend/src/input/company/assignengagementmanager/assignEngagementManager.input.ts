import { Allow } from 'class-validator';
export class AssignEngagementManagerInput {
    @Allow() id: number;
    @Allow() company_id: number;
    @Allow() user_id: string;
    @Allow() status: number;
}
