import {BiometricEntity, OrgBiometricEntity} from "@common-constants";

export interface OrgBiometricInterface extends OrgBiometricEntity {
    birBiometric: BiometricEntity;
}