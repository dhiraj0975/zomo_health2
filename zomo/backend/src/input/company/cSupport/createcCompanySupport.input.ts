import { Allow } from 'class-validator';
export class CreatecCompanySupportInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() program_eligibility: string;
    @Allow() support_team_authorized_create_user_accounts: string;
    @Allow() hr_team_department_name: string;
    @Allow() hr_team_department_email: string;
    @Allow() redirect_to_hr_team_conditions: string;
    @Allow() spouse_participation_required_for_incentive: string;
    @Allow() program_deadline_date: string;
    @Allow() silent_deadline_date: string;
    @Allow() accepted_physician_forms: string;
    @Allow() support_team_authorized_award_points: string;
    @Allow() other: string;
}
