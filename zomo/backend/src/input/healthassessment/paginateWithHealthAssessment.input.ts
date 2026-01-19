import { Allow } from 'class-validator';
export class PaginateWithHealthAssessmentInput {
    @Allow() page: number;
    @Allow() limit: number;
    @Allow() order_by: string;
    @Allow() order: string;
    @Allow() search_str: string;
    @Allow() organization_id: number;
    @Allow() question_id: number;
    @Allow() option_id: number;
    @Allow() tab_id: number;
    @Allow() user_id: number;
    @Allow() activity_id: number;
    @Allow() org_id: number;
    @Allow() assessment_id: number;
    @Allow() sec_ids: string;
    @Allow() questioncat_id: number;
    @Allow() status: number;
    @Allow() request_date: string;
}
