import { Allow } from 'class-validator';
export class CreateQuizzesInput {
    @Allow() cat_id: number;
    @Allow() quiz_name: string;
    @Allow() quiz_description: string;
    @Allow() question_per_page: number;
    @Allow() num_of_questions: number;
    @Allow() quiz_order: number;
    @Allow() status: number;
    @Allow() quiz_type: string;
    @Allow() question_type: string;
    @Allow() question_info: string;
    @Allow() org_id: string;
    @Allow() image: string;
    @Allow() type: string;
    @Allow() webinar_id: number;
    @Allow() is_webinar: number;
    @Allow() is_default: number;
}
