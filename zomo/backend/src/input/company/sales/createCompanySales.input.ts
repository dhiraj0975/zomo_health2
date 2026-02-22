import { Allow } from 'class-validator';
export class CreateCompanySalesInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() demo_lead: string;
    @Allow() demo_date?: string;
    @Allow() onboarding_date: string;
    @Allow() launch_date?: string;
    @Allow() demo_notes: string;
    @Allow() is_zomo_health_selected: number;
    @Allow() decline_reason: string;
    @Allow() demo_recording: string;
}
