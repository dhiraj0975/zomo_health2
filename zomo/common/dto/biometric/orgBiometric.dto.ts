import { Expose, Transform, Type } from 'class-transformer';
import { BiometricDto } from './biometric.dto';
export class OrgBiometricDto {
    @Expose() id: number;
    @Expose() company_id: number;
    @Expose() biometric: number;
    @Expose() start_range_male: number;
    @Expose() end_range_male: number;
    @Expose() start_range_female: number;
    @Expose() end_range_female: number;
    @Expose() is_optional: number;
    @Expose() is_optional_type: number;
    @Expose() is_required: number;
    @Expose() graph_low_start: number;
    @Expose() graph_low_end: number;
    @Expose() graph_mod_start: number;
    @Expose() graph_mod_end: number;
    @Expose() graph_high_start: number;
    @Expose() graph_high_end: number;
    @Expose() graph_vhigh_start: number;
    @Expose() graph_vhigh_end: number;
    @Expose() status: number;
    @Expose()
    test1_start_date: string
    @Expose()
    test1_end_date: string
    @Expose()
    test2_start_date: string
    @Expose()
    test2_end_date: string
    @Expose()
    created: string
    @Expose()
    updated: string;
    @Expose()
    is_hire_date: string;
    @Expose()
    @Type(() => BiometricDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                biometric: value.biometric,
            };
        }
        else {
            return null
        }
    })
    biometrics: BiometricDto;
    @Expose()
    @Type(() => BiometricDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                biometric: value.biometric,
            };
        }
        else {
            return null
        }
    })
    biometricOption: BiometricDto;
}
