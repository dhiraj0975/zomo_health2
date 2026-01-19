import { Allow } from 'class-validator';
export class UpdateCensusCustomFieldsInput {
    @Allow() id: number;
    @Allow() organization_id: number;
    @Allow() title: string;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() show_in_filter: number;
    @Allow() include_in_report: number;
}
