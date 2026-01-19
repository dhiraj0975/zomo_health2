import { Allow } from 'class-validator';
export class UpdateBusinessRuleInput {
    @Allow() id: number;
    @Allow() name: string;
    @Allow() biometric_id: number;
    @Allow() organization_id: number;
    @Allow() module_id: number;
    @Allow() activity_id: string;
    @Allow() progress: number;
    @Allow() progress_setting: number;
    @Allow() c_start_date: string;
    @Allow() c_end_date: string;
    @Allow() type: number;
    @Allow() s_range: number;
    @Allow() e_range: number;
    @Allow() gender: number;
    @Allow() age: number;
    @Allow() ageoption: number;
    @Allow() age_s_range: number;
    @Allow() age_e_range: number;
    @Allow() created_by: number;
    @Allow() status: number;
}
