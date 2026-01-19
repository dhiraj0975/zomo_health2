import { Allow } from 'class-validator';
export class CreateAssessmentCohortReportsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() request_date: string;
    @Allow() year: string;
    @Allow() condition: string;
    @Allow() campaign_id: number;
    @Allow() Campaignactivity: string;
    @Allow() source_ids: string;
    @Allow() file: string;
    @Allow() status: number;
    @Allow() flage: number;
    @Allow() reject: number;
}
