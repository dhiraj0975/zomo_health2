import { Expose, Type } from 'class-transformer';
import { OrgBiometricDto } from './orgBiometric.dto';
export class BiometricOrgSettingDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() is_based: number;
    @Expose() is_hire: number;
    @Expose() is_required: number;
    @Expose() qualifie_type: number;
    @Expose() option: number;
    @Expose() category_option: number;
    @Expose() is_physician_follow: string;
    @Expose() is_talk_to_coach: string;
    @Expose() is_join_challenge: string;
    @Expose() is_learn_more: string;
    @Expose() is_complete_message: string;
    @Expose() is_incomplete_message: string;
    @Expose() is_ontrack_message: string;
    @Expose() status: number;
    @Expose()
    created: string
    @Expose()
    updated: string;
    @Expose()
    is_hire_date: string;
    @Expose()
    @Type(() => OrgBiometricDto)
    biometricOrg: OrgBiometricDto;
}
