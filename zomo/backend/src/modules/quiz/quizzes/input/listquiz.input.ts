import { Allow } from 'class-validator';
export class ListQuizInput {
    @Allow() role_id: number;
    @Allow() auto_request: number;
    @Allow() organization_id: number;
    @Allow() org_id: number;
    @Allow() webinar_id: number;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() type: string;
}
