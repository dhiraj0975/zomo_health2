import { Allow } from 'class-validator';
export class CreateAgeActivityInput {
    @Allow() id: number;
    @Allow() title: string;
    @Allow() group_type: number;
    @Allow() gender: string;
    @Allow() min_age: number;
    @Allow() max_age: number;
    @Allow() org_id: number;
    @Allow() created_by: number;
    @Allow() status: number;
    @Allow() ref_activity_id: number;
    @Allow() common_activity_id: number;
    @Allow() extrahtmlused: number;
    @Allow() accessibility: number;
}
