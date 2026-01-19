import { Allow } from 'class-validator';
export class CreateCustomPointInput {
    @Allow() id: number;
    @Allow() user_name: string;
    @Allow() user_id: number;
    @Allow() org_id: number;
    @Allow() activity_id: number;
    @Allow() activity_name: string;
    @Allow() points: number;
    @Allow() date: string;
    @Allow() status: number;
    @Allow() campaign_id: number;
    @Allow() activity_ids: string;
    @Allow() selected_users: string;     
    @Allow() search_str: string;
}
