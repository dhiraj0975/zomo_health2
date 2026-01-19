import { Transform, Type, Expose } from 'class-transformer';
export class CovidPassportSettingsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() approval_status: number;
    @Expose() description: string;
    @Expose() created_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
