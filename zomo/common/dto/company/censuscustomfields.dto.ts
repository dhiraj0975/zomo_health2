import { Expose } from 'class-transformer';
export class CensusCustomFieldsDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() title: string;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() show_in_filter: number;
    @Expose() include_in_report: number;
    @Expose() created: string;
    @Expose() updated: string;
}
