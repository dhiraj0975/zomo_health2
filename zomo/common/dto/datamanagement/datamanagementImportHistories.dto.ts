import { Transform, Type, Expose } from 'class-transformer';
export class DataManagementImportHistoriesDto {
    @Expose() id: number;
    @Expose() filename: string;
    @Expose() tablename: string;
    @Expose() object_name: string;
    @Expose() oktodelete: number;
    @Expose() crud_status: string;
    @Expose() recordcount: string;
    @Expose() company_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
}
