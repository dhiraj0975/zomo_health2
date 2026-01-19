import { Transform, Type, Expose } from 'class-transformer';
export class DataManagementImportHistoryColumnsDto {
    @Expose() id: number;
    @Expose() csv_columnname: string;
    @Expose() mapcolumnname: string;
    @Expose() position: string;
    @Expose() validationrulesid: string;
    @Expose() dm_import_history_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
}
