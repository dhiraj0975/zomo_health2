import { Allow } from 'class-validator';
export class CreateAssessmentQuestionsInput {
    @Allow() id: number;
    @Allow() tab_id: number;
    @Allow() type: number;
    @Allow() question_type: number;
    @Allow() show_gender: number;
    @Allow() parent_id: number;
    @Allow() parent_option_id: number;
    @Allow() sort_order: number;
    @Allow() required: number;
    @Allow() general_info: number;
    @Allow() not_applicable: number;
    @Allow() m_section_weight: number;
    @Allow() f_section_weight: number;
    @Allow() age_considered: number;
    @Allow() age_limit: number;
    @Allow() age_condition: number;
    @Allow() result_type: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
    @Allow() status: number;
    @Allow() question_title: string;
    @Allow() main_question_id: number;
    @Allow() language_id: number;
}
