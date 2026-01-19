import { Allow } from 'class-validator';
export class CreateCensusCustomFieldsValuesInput {
    @Allow() organization_id: number;
    @Allow() user_id: number;
    @Allow() field_id: number;
    @Allow() field_value: string;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
}
