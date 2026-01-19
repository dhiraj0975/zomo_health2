import { Expose } from 'class-transformer';
export class CCompanySupportDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() program_eligibility: string;
    @Expose() support_team_authorized_create_user_accounts: string;
    @Expose() hr_team_department_name: string;
    @Expose() hr_team_department_email: string;
    @Expose() redirect_to_hr_team_conditions: string;
    @Expose() spouse_participation_required_for_incentive: string;
    @Expose() program_deadline_date: string;
    @Expose() silent_deadline_date: string;
    @Expose() accepted_physician_forms: string;
    @Expose() support_team_authorized_award_points: string;
    @Expose() other: string;
    @Expose() status: number;
}
