import { Expose } from 'class-transformer';
export class CensusCustomFieldsValuesDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() user_id: number;
    @Expose() field_id: number;
    @Expose() field_value: string;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() created: string;
    @Expose() updated: string;
}
