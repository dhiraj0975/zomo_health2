import { Allow } from 'class-validator';
export class ListQuickLinkInput {
    @Allow() c_companies_id: number;
    @Allow() search_str: string;
    @Allow() order: string;
    @Allow() order_by: string;
    @Allow() eligibility: string;
}
