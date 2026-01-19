import { Allow } from 'class-validator';
export class CreateCoachesInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: string;
    @Allow() coach_manager_id: number;
    @Allow() location: string;
    @Allow() department: string;
    @Allow() state: string;
    @Allow() city: string;
    @Allow() is_global: number;
    @Allow() status: number;
}
