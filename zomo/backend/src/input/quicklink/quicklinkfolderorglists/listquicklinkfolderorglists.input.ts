import { Allow } from 'class-validator';
export class ListQuickLinkFolderOrgListsInput {
    @Allow() c_companies_id: number;
    @Allow() folder_id: number;
    @Allow() status: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() search_str: string;
}
