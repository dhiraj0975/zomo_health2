import { Allow } from 'class-validator';
export class CreateClientManagerAssignInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: string;
    @Allow() status: number;
}
