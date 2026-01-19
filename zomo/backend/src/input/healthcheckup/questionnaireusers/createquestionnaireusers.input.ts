import { Allow } from 'class-validator';
export class CreateQuestionnaireUsersInput {
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() entry_name: string;
    @Allow() entry_empid: string;
    @Allow() medical_status_one: number;
    @Allow() medical_status_two: number;
    @Allow() status: number;
    @Allow() participation_wp: number;
    @Allow() participation_wp_data: number;
    @Allow() wellness_score_one: number;
    @Allow() wellness_score_two: number;
}
