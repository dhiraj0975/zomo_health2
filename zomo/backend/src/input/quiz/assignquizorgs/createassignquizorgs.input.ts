import { Allow } from 'class-validator';
export class CreateAssignQuizOrgInput {
    @Allow() quiz_id: number | string | number[] | string[];
    @Allow() organization_id: string;
    @Allow() start_date: string;
    @Allow() end_date: string;
    @Allow() start_time: string;
    @Allow() end_time: string;
    @Allow() timezone: number;
    @Allow() allow_retakes: number;
    @Allow() retakes: number;
    @Allow() status: number;
    @Allow() time_dependent: number;
    @Allow() timer_type: number;
    @Allow() quiz_time: string;
    @Allow() passing_score: number;
    @Allow() publish_result: number;
    @Allow() activity_id: number;
    @Allow() vmsg: string;
    @Allow() is_hire: number;
    @Allow() is_timezone: number;
    @Allow() vlink: string;
    @Allow() is_popup: number;
    @Allow() is_webinar: number;
    @Allow() quiz_type: number;
    @Allow() webinar_id: number | string | number[] | string[];
    @Allow() type: string;
}
