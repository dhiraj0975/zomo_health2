import { Allow } from 'class-validator';
export class AssignBrokerInput {
    @Allow() id: number;
    @Allow() company_id: number;
    @Allow() user_id: number[];
    @Allow() status: number;
}
