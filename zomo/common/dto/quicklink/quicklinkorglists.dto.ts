import { Transform, Type, Expose } from 'class-transformer';
export class QuicklinkOrglistsDto {
    @Expose() id: number;
    @Expose() c_companies_id : number;
    @Expose() quicklink_id: number;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() created: string;
    @Expose() update: string;
}
