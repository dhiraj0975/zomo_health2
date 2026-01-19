import {Allow} from "class-validator";
export class CreateBiometricInput {
    @Allow() id: number;
    @Allow() biometric: string;
    @Allow() status: number;
    @Allow() start_range: number;
    @Allow() end_range: number;
    @Allow() graph_low_start?: number;
    @Allow() graph_low_end?: number;
    @Allow() graph_mod_start?: number;
    @Allow() graph_mod_end?: number;
    @Allow() graph_high_start?: number;
    @Allow() graph_high_end?: number;
    @Allow() graph_vhigh_start?: number;
    @Allow() graph_vhigh_end?: number;
}
