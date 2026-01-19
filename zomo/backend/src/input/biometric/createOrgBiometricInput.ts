import {Allow} from "class-validator";
export class CreateOrgBiometricInput {
    @Allow() id: number;
    @Allow() company_id: number;
    @Allow() biometric: number;
    @Allow() start_range_male: number;
    @Allow() end_range_male: number;
    @Allow() start_range_female: number;
    @Allow() end_range_female: number;
    @Allow() is_optional: number;
    @Allow() is_optional_type: number;
    @Allow() test1_start_date: string;
    @Allow() test1_end_date: string;
    @Allow() test2_start_date: string;
    @Allow() test2_end_date: string;
    @Allow() is_required: number;
    @Allow() graph_low_start: number;
    @Allow() graph_low_end: number;
    @Allow() graph_mod_start: number;
    @Allow() graph_mod_end: number;
    @Allow() graph_high_start: number;
    @Allow() graph_high_end: number;
    @Allow() graph_vhigh_start: number;
    @Allow() graph_vhigh_end: number;
    @Allow() status: number;
}
