import { Allow } from 'class-validator';
export class ListQuickLinkOrgListsInput {
    @Allow() c_companies_id: number;
    @Allow() status: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() search_str: string;
}
