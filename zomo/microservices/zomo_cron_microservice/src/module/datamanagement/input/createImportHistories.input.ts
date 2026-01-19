import { Allow } from 'class-validator';
export class CreateImportHistoriesInput {
    @Allow() id: number;
    @Allow() filename: string;
    @Allow() tablename: string;
    @Allow() object_name: string;
    @Allow() oktodelete: number;
    @Allow() crud_status: string;
    @Allow() recordcount: string;
    @Allow() company_id: number;
    @Allow() status: number;
}
