import { PaginateInput } from '@/input';
import { Allow } from 'class-validator';
export class QuizWebinarPaginateInput extends PaginateInput {
    @Allow() status?: number;
    @Allow() sort_by?: number;
    @Allow() webinar_date?: string;
    @Allow() organization_id?: string;
    @Allow() membership_code?: string;
    @Allow() type?: string;
    @Allow() duration_max?: string;
    @Allow() duration_min?: string;

}
