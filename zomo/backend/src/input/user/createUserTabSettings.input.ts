import {Allow} from 'class-validator';
export class CreateUserTabSettingsInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() s_theme: number;
    @Allow() s_report: number;
    @Allow() s_chat: number;
    @Allow() s_user: number;
    @Allow() s_activity_tracker: number;
    @Allow() s_event: number;
    @Allow() s_quicklink: number;
    @Allow() s_document: number;
    @Allow() s_challenge: number;
    @Allow() s_incentive: number;
    @Allow() s_mass_communication: number;
    @Allow() s_reimbursement: number;
    @Allow() status: number;
}
