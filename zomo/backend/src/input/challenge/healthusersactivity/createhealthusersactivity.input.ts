import { Allow } from 'class-validator';
export class CreateHealthUsersActivityInput {
    @Allow() act_id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() miles: number;
    @Allow() act_date: string;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
}
