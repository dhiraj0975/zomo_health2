import { Allow } from 'class-validator';
export class PaginateWithChallengeInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by?: string;
    @Allow() order?: string;
    @Allow() search_str?: string;
    @Allow() challenge_id?: string;
    @Allow() org_id?: string;
    @Allow() schedule_id?: string;
    @Allow() filter_by?: string;
    @Allow() id?: number;
    @Allow() card_id?: number;
    @Allow() challenge_type?: string;
    @Allow() start_date?: string;
    @Allow() end_date?: string;
    @Allow() group_id?: string;
    @Allow() user_id?: string;
    @Allow() act_id?: string;
    @Allow() act_date?: string;
}
