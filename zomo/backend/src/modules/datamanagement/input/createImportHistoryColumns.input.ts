import { Allow } from 'class-validator';
export class CreateImportHistoryColumnsInput {
    @Allow() id: number;
    @Allow() csv_columnname: string;
    @Allow() mapcolumnname: string;
    @Allow() position: string;
    @Allow() validationrulesid: string;
    @Allow() dm_import_history_id: number;
    @Allow() status: number;
}
