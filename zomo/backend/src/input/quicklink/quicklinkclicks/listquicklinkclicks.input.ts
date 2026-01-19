import { Allow } from 'class-validator';
export class ListQuickLinkClicksInput {
    @Allow() quicklink_id: number;
    @Allow() status: number;
    @Allow() search_str: number;
    @Allow() order: string;
    @Allow() order_by: string;
}
