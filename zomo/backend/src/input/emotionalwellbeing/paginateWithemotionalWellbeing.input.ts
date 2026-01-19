import { Allow } from 'class-validator';
export class PaginateWithEmotionalWellBeingInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() org_id: number;
    @Allow() parent_id: number;
    @Allow() cat_id: number;
    @Allow() t_id: number;
    @Allow() post_id: number;
    @Allow() user_id: number;
    @Allow() activity_id: number;
    @Allow() duration_min: number;
    @Allow() duration_max: number;
    @Allow() is_valid: boolean;
    @Allow() saved_videos: boolean;
    @Allow() categories: string;
    @Allow() sort_by: number;
}
