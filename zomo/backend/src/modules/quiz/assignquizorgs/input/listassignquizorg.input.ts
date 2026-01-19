import { Allow } from 'class-validator';
export class ListAssignQuizOrgInput {
    @Allow() organization_id: string | number;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() type: string;
    @Allow() webinar_id: number;
}
