import { Allow } from 'class-validator';
export class ListQuickLinkFoldersInput {
    @Allow() c_companies_id: string;
    @Allow() status: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() search_str: string;
}
