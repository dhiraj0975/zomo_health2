import { Allow } from 'class-validator';
export class ListMyPlanInput {
    @Allow() id: number;
    @Allow() created_by: number;
    @Allow() search_str: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() activity_id: number;
    @Allow() org_id: number;
    @Allow() organization_id: number;
    @Allow() biometric_id: number;
    @Allow() block_id: number;
    @Allow() type: number;
}
