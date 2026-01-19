import { PaginateInput } from '@/input';
import { Allow } from 'class-validator';
export class PaginateWithCoachesInput extends PaginateInput {
    @Allow() coach_id: number;
    @Allow() coach_manager_id: number;
    @Allow() type: string;
    @Allow() tab: number;
}
