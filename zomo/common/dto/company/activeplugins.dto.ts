import {Expose, Transform, Type} from 'class-transformer';
export class ActivePluginsDto {
    @Expose() id: number;
    @Expose() company_id: number;
    @Expose() plugin_name: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
