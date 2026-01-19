import { Transform, Type, Expose } from 'class-transformer';
export class UserTabSettingsDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() s_theme: number;
    @Expose() s_report: number;
    @Expose() s_chat: number;
    @Expose() s_user: number;
    @Expose() s_activity_tracker: number;
    @Expose() s_event: number;
    @Expose() s_quicklink: number;
    @Expose() s_document: number;
    @Expose() s_challenge: number;
    @Expose() s_incentive: number;
    @Expose() s_mass_communication: number;
    @Expose() s_reimbursement: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
