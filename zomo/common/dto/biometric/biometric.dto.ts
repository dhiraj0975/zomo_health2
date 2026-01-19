import { Expose } from 'class-transformer';
export class BiometricDto {
    @Expose() id: number;
    @Expose() biometric: string;
    @Expose() status: number;
    @Expose() start_range: number;
    @Expose() end_range: number;
    @Expose() graph_low_start: number;
    @Expose() graph_low_end: number;
    @Expose() graph_mod_start: number;
    @Expose() graph_mod_end: number;
    @Expose() graph_high_start: number;
    @Expose() graph_high_end: number;
    @Expose() graph_vhigh_start: number;
    @Expose() graph_vhigh_end: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
