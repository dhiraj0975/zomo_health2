import { Allow } from 'class-validator';
export class GetActivitiesInput {
    @Allow() company_id: number;
    @Allow() department_id: number;
    @Allow() location_id: number;
    @Allow() call_from: number;
}
