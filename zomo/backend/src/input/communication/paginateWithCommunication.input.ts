import { Allow } from 'class-validator';
export class PaginateWithCommunicationInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() parent_id: number;
    @Allow() mail_id: number;
    @Allow() user_id: number;
    @Allow() org_id: number;
    @Allow() for_org_id: number;
    @Allow() role_id: number;
    @Allow() campaign_id: number;
    @Allow() status: any;
    @Allow() type: any | string;
    @Allow() temp_type: any;
    @Allow() date: any;
    @Allow() created_by: any;
}
