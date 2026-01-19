import { Allow } from 'class-validator';
export class CreateAssessmentResultsInput {
    @Allow() id: number;
    @Allow() organization_id: number;
    @Allow() title: string;
    @Allow() 'marker-low': string;
    @Allow() 'marker-mod': string;
    @Allow() 'marker-high': string;
    @Allow() type: number;
    @Allow() is_response: number;
    @Allow() 'marker-common': string;
    @Allow() 'marker-common_last': string;
    @Allow() order_id: number;
    @Allow() no_of_risk: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
}
