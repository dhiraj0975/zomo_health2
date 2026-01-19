import { Allow } from 'class-validator';
export class CreateAssessmentTabsInput {
    @Allow() id: number;
    @Allow() organization_id: number;
    @Allow() title: string;
    @Allow() sort_order: number;
    @Allow() 'marker-low': string;
    @Allow() 'marker-mod': string;
    @Allow() 'marker-high': string;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
