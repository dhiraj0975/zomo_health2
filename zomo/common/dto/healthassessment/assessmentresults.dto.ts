import { Transform, Type, Expose } from 'class-transformer';
export class AssessmentResultsDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() title: string;
    @Expose() 'marker-low': string;
    @Expose() 'marker-mod': string;
    @Expose() 'marker-high': string;
    @Expose() type: number;
    @Expose() is_response: number;
    @Expose() 'marker-common': string;
    @Expose() 'marker-common_last': string;
    @Expose() order_id: number;
    @Expose() no_of_risk: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
