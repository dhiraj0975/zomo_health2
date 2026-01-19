import { Allow } from 'class-validator';
export class CreateDocumentInput {
    @Allow() id: number;
    @Allow() title: string;
    @Allow() doc_name: string;
    @Allow() organization_id: number;
    @Allow() description: string;
    @Allow() file_name: string;
    @Allow() is_global: number;
    @Allow() is_login: number;
    @Allow() status: number;
    @Allow() created_by: number;
}
