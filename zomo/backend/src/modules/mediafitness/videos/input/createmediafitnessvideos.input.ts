import { Allow } from 'class-validator';
export class CreateMediaFitnessVideosInput {
    @Allow() id: number;
    @Allow() v_id: number;
    @Allow() org_id: number;
    @Allow() v_link: string;
    @Allow() name: string;
    @Allow() duration: number;
    @Allow() difficulty_id: number;
    @Allow() calories: number;
    @Allow() description: string;
    @Allow() image_poster: string;
    @Allow() image_thumb: string;
    @Allow() duration_id: number;
    @Allow() rating_avg: number;
    @Allow() rating_count: number;
    @Allow() rating_avg_category: number;
    @Allow() rating_count_category: number;
    @Allow() rating_avg_series: number;
    @Allow() rating_count_series: number;
    @Allow() provider_name: string;
    @Allow() category_ids: string;
    @Allow() focus_ids: string;
    @Allow() equipment_ids: string;
    @Allow() series_ids: string;
    @Allow() instructors_ids: string;
    @Allow() status: number;
}
