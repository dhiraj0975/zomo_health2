import { Allow } from 'class-validator';
export class PaginationWithMediaFitnessInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() cat_id: number;
    @Allow() org_id: number;
    @Allow() d_id: number;
    @Allow() e_id: number;
    @Allow() f_id: number;
    @Allow() i_id: number;
    @Allow() s_id: number;
    @Allow() v_id: number;
    @Allow() c_id: number;
    @Allow() user_id: number;
    @Allow() activity_id: number;
    @Allow() parent_id: number;
    @Allow() is_valid: boolean;
    @Allow() saved_videos: boolean;
    @Allow() categories: string;
    @Allow() focus: string;
    @Allow() equipment: string;
    @Allow() series: string;
    @Allow() sort_by: number;
    @Allow() video_setting: number;
    @Allow() exclude_v_id: number;
}
