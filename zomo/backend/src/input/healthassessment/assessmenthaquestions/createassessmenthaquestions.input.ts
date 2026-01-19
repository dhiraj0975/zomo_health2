import { Allow } from 'class-validator';
export class CreateAssessmentHaQuestionsInput {
    @Allow() id: number;
    @Allow() questioncat_id: number;
    @Allow() language_id: number;
    @Allow() main_question_id: number;
    @Allow() title: string;
    @Allow() question_title: string;
    @Allow() type: number;
    @Allow() show: number;
    @Allow() company_id: string;
    @Allow() parent_id: number;
    @Allow() parent_option_id: number;
    @Allow() order: number;
    @Allow() general: string;
    @Allow() required: number;
    @Allow() na: number;
    @Allow() question_code: string;
    @Allow() chart_group: string;
    @Allow() mchart_group_wt: number;
    @Allow() fchart_group_wt: number;
    @Allow() msection_wt: number;
    @Allow() fsection_wt: number;
    @Allow() age_considered: number;
    @Allow() age_limit: number;
    @Allow() age_condition: number;
}
